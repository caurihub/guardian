import "@cauriland/core-test-framework/dist/matchers";

import { Contracts } from "@cauriland/core-kernel";
import { passphrases, snoozeForBlock } from "@cauriland/core-test-framework";
import { Enums } from "@caurihub/guardian-crypto";

import * as support from "../__support__";
import { GuardianTransactionFactory } from "../__support__/transaction-factory";

const groupPermissionsAsset = {
    name: "group name vField",
    priority: 1,
    default: false,
    active: true,
    allow: [
        {
            transactionType: Enums.GuardianTransactionTypes.GuardianSetGroupPermissions,
            transactionTypeGroup: Enums.GuardianTransactionGroup,
        },
    ],
};

let app: Contracts.Kernel.Application;
beforeAll(async () => (app = await support.setUp()));
afterAll(async () => await support.tearDown());

describe("Guardian set group permissions functional tests - with VendorField", () => {
    it("should broadcast, accept and forge it [Signed with 1 Passphrase]", async () => {
        // Set group permissions
        const setGroupPermissions = GuardianTransactionFactory.initialize(app)
            .GuardianSetGroupPermissions(groupPermissionsAsset)
            .withVendorField("VendorField test -> [GuardianGroupPermissions]")
            .withPassphrase(passphrases[0]!)
            .createOne();

        await expect(setGroupPermissions).toBeAccepted();
        await snoozeForBlock(1);
        await expect(setGroupPermissions.id).toBeForged();
    });
});
