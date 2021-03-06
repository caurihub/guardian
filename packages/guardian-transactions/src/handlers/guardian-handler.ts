import { Container, Contracts, Providers } from "@cauriland/core-kernel";
import { Handlers } from "@cauriland/core-transactions";
import { Interfaces, Managers, Utils } from "@cauriland/crypto";
import { Interfaces as GuardianInterfaces } from "@caurihub/guardian-crypto";

import { FeeType } from "../enums";
import { StaticFeeMismatchError, TransactionTypeDoesntExistError } from "../errors";
import { IGroupPermissions } from "../interfaces";

const pluginName = require("../../package.json").name;

export abstract class GuardianTransactionHandler extends Handlers.TransactionHandler {
    @Container.inject(Container.Identifiers.TransactionHistoryService)
    protected readonly transactionHistoryService!: Contracts.Shared.TransactionHistoryService;

    @Container.inject(Container.Identifiers.TransactionPoolQuery)
    protected readonly poolQuery!: Contracts.TransactionPool.Query;

    @Container.inject(Container.Identifiers.CacheService)
    @Container.tagged("cache", pluginName)
    protected readonly groupsPermissionsCache!: Contracts.Kernel.CacheStore<
        IGroupPermissions["name"],
        IGroupPermissions
    >;

    @Container.inject(Container.Identifiers.PluginConfiguration)
    @Container.tagged("plugin", pluginName)
    protected readonly configuration!: Providers.PluginConfiguration;

    public async isActivated(): Promise<boolean> {
        return Managers.configManager.getMilestone().aip11 === true;
    }

    public override dynamicFee({
        addonBytes,
        satoshiPerByte,
        transaction,
        height,
    }: Contracts.Shared.DynamicFeeContext): Utils.BigNumber {
        const feeType = this.configuration.get<FeeType>("feeType");

        if (feeType === FeeType.Static) {
            return this.getConstructor().staticFee({ height });
        }
        if (feeType === FeeType.None) {
            return Utils.BigNumber.ZERO;
        }

        return super.dynamicFee({ addonBytes, satoshiPerByte, transaction, height });
    }

    public override async throwIfCannotBeApplied(
        transaction: Interfaces.ITransaction,
        wallet: Contracts.State.Wallet,
    ): Promise<void> {
        const feeType = this.configuration.get<FeeType>("feeType");

        if (feeType === FeeType.Static) {
            const staticFee = this.getConstructor().staticFee();

            if (!transaction.data.fee.isEqualTo(staticFee)) {
                throw new StaticFeeMismatchError(staticFee.toFixed());
            }
        }
        return super.throwIfCannotBeApplied(transaction, wallet);
    }

    protected getDefaultCriteria() {
        return {
            typeGroup: this.getConstructor().typeGroup,
            type: this.getConstructor().type,
        };
    }

    protected async getLastTxByAsset(
        asset: Interfaces.ITransactionAsset,
    ): Promise<Interfaces.ITransactionData | undefined> {
        const criteria = {
            ...this.getDefaultCriteria(),
            asset,
        };
        const order: Contracts.Search.Sorting = [
            { property: "timestamp", direction: "desc" },
            { property: "sequence", direction: "desc" },
        ];
        const [lastTx] = (
            await this.transactionHistoryService.listByCriteria(criteria, order, {
                offset: 0,
                limit: 1,
            })
        ).results;

        return lastTx;
    }

    protected verifyPermissions(
        asset: GuardianInterfaces.IGuardianUserPermissionsAsset | GuardianInterfaces.IGuardianGroupPermissionsAsset,
    ): void {
        const { allow, deny } = this.sanitizePermissions(asset.allow, asset.deny);
        const mergedPermissions = [...allow, ...deny];
        this.verifyPermissionsTypes(mergedPermissions);
    }

    protected sanitizePermissions(
        allow: GuardianInterfaces.IPermission[] | undefined,
        deny: GuardianInterfaces.IPermission[] | undefined,
    ): { allow: GuardianInterfaces.IPermission[]; deny: GuardianInterfaces.IPermission[] } {
        return { allow: allow || [], deny: deny || [] };
    }

    private verifyPermissionsTypes(permissions: GuardianInterfaces.IPermission[]): void {
        const transactionHandlerRegistry = this.app.getTagged<Handlers.Registry>(
            Container.Identifiers.TransactionHandlerRegistry,
            "state",
            "null",
        );
        const registeredTransactionHandlers = transactionHandlerRegistry.getRegisteredHandlers();

        for (const permission of permissions) {
            if (!this.isRegisteredHandler(registeredTransactionHandlers, permission)) {
                throw new TransactionTypeDoesntExistError();
            }
        }
    }

    private isRegisteredHandler(handlers: Handlers.TransactionHandler[], type: GuardianInterfaces.IPermission) {
        return handlers.find((handler) => {
            const constructor = handler.getConstructor();
            return constructor.type === type.transactionType && constructor.typeGroup === type.transactionTypeGroup;
        });
    }
}
