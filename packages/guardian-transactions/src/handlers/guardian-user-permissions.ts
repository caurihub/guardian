import { Container, Contracts, Utils as AppUtils } from "@cauriland/core-kernel";
import { Handlers } from "@cauriland/core-transactions";
import { Interfaces, Transactions } from "@cauriland/crypto";
import { Interfaces as GuardianInterfaces, Transactions as GuardianTransactions } from "@caurihub/guardian-crypto";

import { GroupDoesntExistError, UserInToManyGroupsError } from "../errors";
import { GuardianApplicationEvents } from "../events";
import { IUserPermissions } from "../interfaces";
import { GuardianIndexers } from "../wallet-indexes";
import { GuardianTransactionHandler } from "./guardian-handler";

@Container.injectable()
export class GuardianUserPermissionsHandler extends GuardianTransactionHandler {
    public getConstructor(): Transactions.TransactionConstructor {
        return GuardianTransactions.GuardianUserPermissionsTransaction;
    }

    public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
        return [];
    }

    public walletAttributes(): ReadonlyArray<string> {
        return ["guardian.userPermissions"];
    }

    public async bootstrap(): Promise<void> {
        for await (const transaction of this.transactionHistoryService.streamByCriteria(this.getDefaultCriteria())) {
            AppUtils.assert.defined<GuardianInterfaces.IGuardianUserPermissionsAsset>(
                transaction.asset?.setUserPermissions,
            );

            const setUserPermissionsAsset: GuardianInterfaces.IGuardianUserPermissionsAsset =
                transaction.asset.setUserPermissions;
            const userWallet = this.walletRepository.findByPublicKey(setUserPermissionsAsset.publicKey);
            const userPermissionsWallet = this.buildUserPermissions(setUserPermissionsAsset);

            userWallet.setAttribute("guardian.userPermissions", userPermissionsWallet);
            this.walletRepository.setOnIndex(
                GuardianIndexers.UserPermissionsIndexer,
                setUserPermissionsAsset.publicKey,
                userWallet,
            );
        }
    }

    public override emitEvents(transaction: Interfaces.ITransaction, emitter: Contracts.Kernel.EventDispatcher): void {
        void emitter.dispatch(GuardianApplicationEvents.SetUserPermissions, transaction.data);
    }

    public override async throwIfCannotBeApplied(
        transaction: Interfaces.ITransaction,
        sender: Contracts.State.Wallet,
    ): Promise<void> {
        AppUtils.assert.defined<GuardianInterfaces.IGuardianUserPermissionsAsset>(
            transaction.data.asset?.setUserPermissions,
        );
        const setUserPermissionsAsset: GuardianInterfaces.IGuardianUserPermissionsAsset =
            transaction.data.asset.setUserPermissions;

        if (setUserPermissionsAsset.groupNames?.length) {
            const maxDefinedGroupsPerUser = this.configuration.get<number>("maxDefinedGroupsPerUser");
            if (setUserPermissionsAsset.groupNames.length > maxDefinedGroupsPerUser!) {
                throw new UserInToManyGroupsError(maxDefinedGroupsPerUser!);
            }

            // check if all groups exists
            for (const groupName of setUserPermissionsAsset.groupNames) {
                if (await this.groupsPermissionsCache.missing(groupName)) {
                    throw new GroupDoesntExistError(groupName);
                }
            }
        }

        this.verifyPermissions(setUserPermissionsAsset);

        return super.throwIfCannotBeApplied(transaction, sender);
    }

    public override async throwIfCannotEnterPool(transaction: Interfaces.ITransaction): Promise<void> {
        const { publicKey }: GuardianInterfaces.IGuardianUserPermissionsAsset =
            transaction.data.asset!.setUserPermissions;
        const hasUserPermissionsTx: boolean = this.poolQuery
            .getAll()
            .whereKind(transaction)
            .wherePredicate((t) => t.data.asset!.setUserPermissions.publicKey === publicKey)
            .has();

        if (hasUserPermissionsTx) {
            throw new Contracts.TransactionPool.PoolError(
                `Guardian setUserPermissions, user permissions change for "${publicKey}" already in pool`,
                "ERR_PENDING",
            );
        }
    }

    public async applyToRecipient(transaction: Interfaces.ITransaction): Promise<void> {
        // Line is already checked inside throwIfCannotBeApplied run by applyToSender method
        // AppUtils.assert.defined<GuardianInterfaces.IGuardianUserPermissionsAsset>(
        //     transaction.data.asset?.setUserPermissions,
        // );
        const setUserPermissionsAsset: GuardianInterfaces.IGuardianUserPermissionsAsset =
            transaction.data.asset!.setUserPermissions;
        const userWallet = this.walletRepository.findByPublicKey(setUserPermissionsAsset.publicKey);
        const userPermissionsWallet = this.buildUserPermissions(setUserPermissionsAsset);

        userWallet.setAttribute("guardian.userPermissions", userPermissionsWallet);
        this.walletRepository.setOnIndex(
            GuardianIndexers.UserPermissionsIndexer,
            setUserPermissionsAsset.publicKey,
            userWallet,
        );
    }

    public async revertForRecipient(transaction: Interfaces.ITransaction): Promise<void> {
        const setUserPermissionsAsset: GuardianInterfaces.IGuardianUserPermissionsAsset =
            transaction.data.asset!.setUserPermissions;
        const userWallet = this.walletRepository.findByPublicKey(setUserPermissionsAsset.publicKey);

        const lastUserPermissionsTx = await this.getLastTxByAsset({
            setUserPermissions: {
                publicKey: setUserPermissionsAsset.publicKey,
            },
        });

        if (!lastUserPermissionsTx) {
            userWallet.forgetAttribute("guardian.userPermissions");
            this.walletRepository.forgetOnIndex(
                GuardianIndexers.UserPermissionsIndexer,
                setUserPermissionsAsset.publicKey,
            );
        } else {
            const userPermissionsWallet = this.buildUserPermissions(lastUserPermissionsTx.asset!.setUserPermissions);
            userWallet.setAttribute("guardian.userPermissions", userPermissionsWallet);
            this.walletRepository.setOnIndex(
                GuardianIndexers.UserPermissionsIndexer,
                setUserPermissionsAsset.publicKey,
                userWallet,
            );
        }
    }

    private buildUserPermissions(
        userPermissionsAsset: GuardianInterfaces.IGuardianUserPermissionsAsset,
    ): IUserPermissions {
        return {
            groups: userPermissionsAsset.groupNames || [],
            ...this.sanitizePermissions(userPermissionsAsset.allow, userPermissionsAsset.deny),
        };
    }
}
