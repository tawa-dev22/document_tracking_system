import { io } from 'socket.io-client';

let socket;

export function connectSocket(token) {
  if (!token) return null;
  if (socket) socket.disconnect();
  socket = io(import.meta.env.VITE_SOCKET_URL, {
    auth: { token },
    withCredentials: true
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) socket.disconnect();
  socket = null;
}
