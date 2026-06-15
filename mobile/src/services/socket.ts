import { io, Socket } from 'socket.io-client';

const SOCKET_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (__DEV__ ? 'http://192.168.1.10:3002' : 'https://api.qtriviaperu.com');

let socket: Socket | null = null;
let _msgSeq = 0;
export const newMsgId = () => `${Date.now()}-${++_msgSeq}`;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: false,
    });
  }
  return socket;
};

export const connectSocket = () => { getSocket().connect(); return getSocket(); };

export const disconnectSocket = () => {
  socket?.disconnect();
};

// Lobby events (emit)
export const joinLobby = (gameId: string, userId: string) =>
  getSocket().emit('join:lobby', { gameId, userId });

export const sendChat = (gameId: string, userId: string, username: string, message: string) =>
  getSocket().emit('send:chat', { gameId, userId, username, message });

export const submitAnswer = (
  gameId: string,
  userId: string,
  qIdx: number,
  answerIndex: number
) => getSocket().emit('submit:answer', { gameId, userId, qIdx, answerIndex });

// Lobby events (listen) — always replace existing listener to prevent duplicates on the singleton socket
const on = (event: string, cb: (data: any) => void) => {
  const s = getSocket();
  s.off(event);
  s.on(event, cb);
};

export const onLobbyState = (cb: (data: any) => void) => on('game:lobby', cb);
export const onPotUpdate = (cb: (data: any) => void) => on('pot:update', cb);
export const onLobbyUpdate = (cb: (data: any) => void) => on('lobby:update', cb);
export const onQuestion = (cb: (data: any) => void) => on('game:question', cb);
export const onReveal = (cb: (data: any) => void) => on('game:reveal', cb);
export const onGameFinish = (cb: (data: any) => void) => on('game:finish', cb);
export const onChat = (cb: (data: any) => void) => on('lobby:chat', cb);
export const onWaitingNext = (cb: (data: any) => void) => on('game:waiting_next', cb);
export const onGameCountdown = (cb: (data: { gameId: string; seconds: number }) => void) => on('game:countdown', cb);
export const onLifeResult = (cb: (data: { success: boolean; livesLeft?: number; message?: string }) => void) => on('life:result', cb);
export const onRegistrationClosed = (cb: (data: { gameId: string }) => void) => on('game:registration_closed', cb);

export const hostNext = (gameId: string) =>
  getSocket().emit('host:next', { gameId });

export const useLife = (gameId: string, userId: string) =>
  getSocket().emit('use:life', { gameId, userId });

export const offAll = () => {
  const s = getSocket();
  [
    'game:lobby',
    'pot:update',
    'lobby:update',
    'game:question',
    'game:reveal',
    'game:finish',
    'lobby:chat',
    'game:waiting_next',
    'game:countdown',
    'life:result',
    'game:registration_closed',
  ].forEach((e) => s.off(e));
};
