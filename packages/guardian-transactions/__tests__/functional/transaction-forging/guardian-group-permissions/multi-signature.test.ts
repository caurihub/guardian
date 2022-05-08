import "@cauriland/core-test-framework/dist/matchers";

import { Contracts } from "@cauriland/core-kernel";
import { passphrases, snoozeForBlock, TransactionFactory } from "@cauriland/core-test-framework";
import { Identities } from "@cauriland/crypto";
import { Enums } from "@caurihub/guardian-crypto";
import { generateMnemonic } from "bip39";

import * as support from "../__support__";
import { GuardianTransactionFactory } from "../__support__/transaction-factory";

const groupPermissionsAsset = {
    name: "group name",
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

describe("Guardian set group permissions functional tests - Signed with multi signature", () => {
    // Register a multi signature wallet with defaults
    const passphrase = generateMnemonic();
    const secrets = [passphrase, passphrases[4]!, passphrases[5]!];
    const participants = [
        Identities.PublicKey.fromPassphrase(secrets[0]!),
        Identities.PublicKey.fromPassphrase(secrets[1]!),
        Identities.PublicKey.fromPassphrase(secrets[2]!),
    ];
    it("should broadcast, accept and forge it [3-of-3 multisig]", async () => {
        // Funds to register a multi signature wallet
        const initialFunds = TransactionFactory.initialize(app)
            .transfer(Identities.Address.fromPassphrase(passphrase), 50 * 1e8)
            .withPassphrase(passphrases[0]!)
            .createOne();

        await expect(initialFunds).toBeAccepted();
        await snoozeForBlock(1);
        await expect(initialFunds.id).toBeForged();

        // Registering a multi-signature wallet
        const multiSignature = TransactionFactory.initialize(app)
            .multiSignature(participants, 3)
            .withPassphrase(passphrase)
            .withPassphraseList(secrets)
            .createOne();

        await expect(multiSignature).toBeAccepted();
        await snoozeForBlock(1);
        await expect(multiSignature.id).toBeForged();

        // Send funds to multi signature wallet
        const multiSigAddress = Identities.Address.fromMultiSignatureAsset(multiSignature.asset!.multiSignature!);
        const multiSigPublicKey = Identities.PublicKey.fromMultiSignatureAsset(multiSignature.asset!.multiSignature!);

        const multiSignatureFunds = TransactionFactory.initialize(app)
            .transfer(multiSigAddress, 100 * 1e8)
            .withPassphrase(passphrases[0]!)
            .createOne();

        await expect(multiSignatureFunds).toBeAccepted();
        await snoozeForBlock(1);
        await expect(multiSignatureFunds.id).toBeForged();

        // Set group permissions
        const setGroupPermissions = GuardianTransactionFactory.initialize(app)
            .GuardianSetGroupPermissions(groupPermissionsAsset)
            .withPassphrase(passphrases[0]!)
            .withSenderPublicKey(multiSigPublicKey)
            .withPassphraseList(secrets)
            .createOne();

        await expect(setGroupPermissions).toBeAccepted();
        await snoozeForBlock(1);
        await expect(setGroupPermissions.id).toBeForged();
    });
});
