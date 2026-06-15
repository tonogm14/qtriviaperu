import 'dotenv/config';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
declare const app: import("express-serve-static-core").Express;
declare const httpServer: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
declare const io: SocketServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export { app, io, httpServer };
//# sourceMappingURL=index.d.ts.map