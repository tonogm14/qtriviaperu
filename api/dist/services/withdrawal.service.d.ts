import { WithdrawalStatus } from '@prisma/client';
/**
 * Request a withdrawal.
 */
export declare function requestWithdrawal(userId: string, data: {
    amount: number;
    method: string;
    accountRef: string;
}): Promise<object>;
/**
 * Update withdrawal status (admin).
 */
export declare function updateWithdrawalStatus(withdrawalId: string, status: WithdrawalStatus): Promise<object>;
//# sourceMappingURL=withdrawal.service.d.ts.map