import { Contracts } from "@cauriland/core-kernel";
import { TransactionFactory } from "@cauriland/core-test-framework";
import { Builders as GuardianBuilders, Interfaces as GuardianInterfaces } from "@caurihub/guardian-crypto";

export class GuardianTransactionFactory extends TransactionFactory {
    protected constructor(app?: Contracts.Kernel.Application) {
        super(app);
    }

    public static override initialize(app?: Contracts.Kernel.Application): GuardianTransactionFactory {
        return new GuardianTransactionFactory(app);
    }

    public GuardianSetUserPermissions(
        userPermissions: GuardianInterfaces.IGuardianUserPermissionsAsset,
    ): GuardianTransactionFactory {
        this.builder = new GuardianBuilders.GuardianUserPermissionsBuilder().GuardianUserPermissions(userPermissions);

        return this;
    }

    public GuardianSetGroupPermissions(
        groupPermissions: GuardianInterfaces.IGuardianGroupPermissionsAsset,
    ): GuardianTransactionFactory {
        this.builder = new GuardianBuilders.GuardianGroupPermissionsBuilder().GuardianGroupPermissions(
            groupPermissions,
        );

        return this;
    }
}
