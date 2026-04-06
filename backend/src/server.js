import http from 'http';
import { seedInitialAdmin } from './config/seed.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { initSocket } from './sockets/index.js';
import { initReminderCron } from './services/reminder.service.js';

async function start() {
  await connectDB();
  await seedInitialAdmin();
  const app = createApp();
  const server = http.createServer(app);
  const io = await initSocket(server);
  app.set('io', io);
  initReminderCron(io);

  server.listen(env.port, () => {
    console.log(`[startup] backend listening on port ${env.port}`);
  });

  const shutdown = (signal) => {
    console.log(`[shutdown] received ${signal}, closing http server`);
    server.close((error) => {
      if (error) {
        console.error('[shutdown] server close failed', error);
        process.exit(1);
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
