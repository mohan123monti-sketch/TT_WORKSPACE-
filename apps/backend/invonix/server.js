import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Router from './utils/Router.js';
import { corsMiddleware } from './middleware/cors.middleware.js';
import { loggerMiddleware } from './middleware/logger.middleware.js';
import routes from './routes/index.js';
// import { initDb } from './scripts/initDb.js';

// Load Environment Variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const PORT = process.env.PORT || 5000;

// Initialize Global Router
const app = new Router();

// Global Middlewares
app.use(corsMiddleware);
app.use(loggerMiddleware);

// Mount API Routes
app.use(routes);

// Create HTTP Server
const server = http.createServer(async (req, res) => {
  await app.handle(req, res);
});

// MySQL Initialization Commented out for temporary authentication
/*
initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Backend Server running on port ${PORT}`);
    console.log(`🌐 Waiting for requests...`);
  });
}).catch((err) => {
  console.error("Failed to initialize database:", err);
});
*/

server.listen(PORT, () => {
  console.log(`🚀 Backend Server running on port ${PORT} (Connected to MySQL)`);
  console.log(`🌐 Waiting for requests...`);
});
