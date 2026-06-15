import { Prisma } from '@prisma/client';
export type LedgerType = 'PRIZE_WIN' | 'ENTRY_FEE' | 'WITHDRAWAL_REQUEST' | 'WITHDRAWAL_REFUND' | 'BONUS' | 'ADJUSTMENT';
export type LedgerRefType = 'GAME' | 'WITHDRAWAL' | 'ADMIN';
/**
 * Record a ledger entry within an existing transaction client.
 * Caller must supply the balanceAfter value (computed from the balance update).
 */
export declare function ledgerEntry(tx: Prisma.TransactionClient, userId: string, opts: {
    type: LedgerType;
    amount: number;
    balanceAfter: number;
    description: string;
    referenceId?: string;
    referenceType?: LedgerRefType;
}): Prisma.Prisma__BalanceLedgerClient<{
    id: string;
    type: string;
    createdAt: Date;
    userId: string;
    amount: number;
    balanceAfter: number;
    description: string;
    referenceId: string | null;
    referenceType: string | null;
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare function getUserLedger(userId: string, page: number, limit: number): Promise<{
    entries: {
        id: string;
        type: string;
        createdAt: Date;
        userId: string;
        amount: number;
        balanceAfter: number;
        description: string;
        referenceId: string | null;
        referenceType: string | null;
    }[];
    total: number;
    page: number;
    limit: number;
}>;
//# sourceMappingURL=ledger.service.d.ts.map