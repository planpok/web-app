import { io, type Socket } from 'socket.io-client';

import { getSocketServerUrl } from '@/lib/config';

export function connectToSession(sessionCode: string): Socket {
  const socket = io(getSocketServerUrl(), {
    autoConnect: true,
    reconnection: true,
    transports: ['websocket']
  });

  socket.emit('session.subscribe', { sessionCode });
  return socket;
}
