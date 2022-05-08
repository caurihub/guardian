import "jest-extended";

import { Transactions } from "@cauriland/crypto";
import { Transactions as GuardianTransactions } from "@caurihub/guardian-crypto";

export const deregisterTransactions = () => {
    Transactions.TransactionRegistry.deregisterTransactionType(GuardianTransactions.GuardianUserPermissionsTransaction);
    Transactions.TransactionRegistry.deregisterTransactionType(
        GuardianTransactions.GuardianGroupPermissionsTransaction,
    );
};
