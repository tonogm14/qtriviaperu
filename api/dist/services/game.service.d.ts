/**
 * Join a game. Handles life deduction for free games and fee payment for VIP games.
 */
export declare function joinGame(userId: string, gameId: string): Promise<void>;
/**
 * Start a game — transition PENDING/LOBBY → LIVE.
 * For recurring games, automatically creates the next day's game on start.
 */
export declare function startGame(gameId: string): Promise<void>;
/**
 * Record answer for a user in a game question round.
 */
export declare function recordAnswer(gameId: string, userId: string, qIdx: number, answerIndex: number): Promise<{
    correct: boolean;
    correctIndex: number;
}>;
/**
 * Finish a game — distribute prizes, log events, archive the game.
 * Recurring games are NOT reset — the next occurrence was already created at startGame().
 */
export declare function finishGame(gameId: string): Promise<{
    winner: string | null;
    winners: Array<{
        username: string;
        prize: number;
    }>;
    prize: number;
}>;
//# sourceMappingURL=game.service.d.ts.map