import { Server as SocketServer } from 'socket.io';
export declare function initGameSocket(io: SocketServer): void;
/**
 * Start a game: emit lobby countdown then begin questions.
 */
export declare function broadcastGameStart(io: SocketServer, gameId: string, autoPlay?: boolean): Promise<void>;
//# sourceMappingURL=gameSocket.d.ts.map