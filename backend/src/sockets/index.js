import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import Document from '../models/Document.js';
import { canAccessDocument } from '../utils/permissions.js';

export async function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: env.clientUrl,
      credentials: true
    }
  });

  if (env.redisUrl) {
    const pubClient = createClient({ url: env.redisUrl });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[Socket.IO] Redis adapter enabled (multi-instance / load-balanced)');
  }

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));
      const payload = jwt.verify(token, env.jwtAccessSecret);
      socket.user = payload;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.sub}`);

    socket.on('document:join', async (documentId) => {
      try {
        if (!documentId) return;
        const document = await Document.findById(documentId).select('sender assignedUsers recipients');
        if (!document) return;

        const user = { _id: socket.user.sub, role: socket.user.role || 'USER' };
        if (!canAccessDocument(user, document)) return;

        socket.join(`document:${documentId}`);
      } catch {
        // silently ignore invalid join attempts
      }
    });
  });

  return io;
}
