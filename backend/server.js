import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import asyncHandler from 'express-async-handler';
import session from 'express-session';
import passport from 'passport';
import { configureStrategies } from './config/passport.js';

import { testConnection } from './config/db.js';
import authRoutes from './routes/sql/auth.routes.js';
import productsRoutes from './routes/sql/products.routes.js';
import ordersRoutes from './routes/sql/orders.routes.js';
import adminRoutes from './routes/sql/admin.routes.js';
import aiRoutes from './routes/sql/ai.routes.js';
import realtimeRoutes from './routes/sql/realtime.routes.js';
import { errorHandler, notFound } from './middleware/error.js';
import { initializeRealtime, subscribeToTable, broadcastChange, isRealtimeConnected } from './services/realtimeService.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 8080);

const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.set('trust proxy', 1);

// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'"],
//         scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "cdn.tailwindcss.com", "cdnjs.cloudflare.com", "unpkg.com", "cdn.socket.io"],
//         styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdn.tailwindcss.com"],
//         imgSrc: ["'self'", "data:", "https:", "placehold.co", "raw.githubusercontent.com"],
//         connectSrc: ["'self'", "ws:", "wss:", "https:", "*.ngrok-free.app"],
//         fontSrc: ["'self'", "fonts.gstatic.com"],
//         objectSrc: ["'none'"],
//         mediaSrc: ["'self'"],
//         frameSrc: ["'self'", "localhost:*"],
//       },
//     },
//     crossOriginEmbedderPolicy: false,
//     crossOriginResourcePolicy: false,
//     crossOriginOpenerPolicy: false,
//   })
// );
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(
  cors({
    origin(origin, callback) {
      // Allow if origin matches CORS_ORIGIN or if it's an ngrok url
      if (!origin || corsOrigins.length === 0 || corsOrigins.includes('*') || corsOrigins.includes(origin) || (origin.includes('.ngrok') || origin.includes('.ngrok-free.app'))) {
        return callback(null, true);
      }
      return callback(new Error('CORS origin not allowed'));
    },
    credentials: true
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 200),
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);

// Passport \u0026 Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'techturf_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());
configureStrategies();

app.get('/health', async (req, res) => {
  try {
    await testConnection();
    const realtimeStatus = isRealtimeConnected() ? 'connected' : 'disconnected';
    res.json({
      success: true,
      service: 'Tech Turf API',
      db: 'ok',
      realtime: realtimeStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      service: 'Tech Turf API',
      db: 'error',
      message: error.message
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/realtime', realtimeRoutes);

const uploadsPath = path.join(__dirname, 'uploads');
const frontendPath = path.join(__dirname, '../frontend');

// --- STATIC FILE SERVING ---
// 1. Serve Uploads (Images)
app.use('/uploads', express.static(uploadsPath));

// 2. Serve Frontend Files
// Primary: Serve from root (for index.html, src/, public/)
app.use(express.static(frontendPath));

// Secondary: Serve from 'pages' folder (allows links like /shopping.html to work)
app.use(express.static(path.join(frontendPath, 'pages')));

// 3. Fallback to 404
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const errorPage = path.join(frontendPath, 'pages/404.html');
    res.status(404).sendFile(errorPage, (err) => {
      if (err) {
        res.status(404).send('404 Page Not Found');
      }
    });
  } else {
    res.status(404).json({ success: false, message: 'API Endpoint Not Found' });
  }
});

// 4. Global Error Handler (Must be last)
// This ensures that even on 500 errors, the server returns JSON, not HTML.
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal System Hub Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// app.use(notFound);
app.use(errorHandler);

async function bootstrap() {
  try {
    // Test database connection
    await testConnection();
    console.log('✓ Database connection successful');

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize WebSocket server for real-time updates
    const wss = new WebSocketServer({ server, path: '/ws' });
    const wsClients = new Set();

    // Initialize Supabase Real-time
    const realtimeInitialized = initializeRealtime();

    wss.on('connection', (ws) => {
      console.log('✓ New WebSocket client connected');
      wsClients.add(ws);

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Real-time connection established',
        timestamp: new Date().toISOString()
      }));

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);

          if (message.type === 'subscribe' && message.table && realtimeInitialized) {
            // Subscribe to table changes
            subscribeToTable(message.table, (payload) => {
              broadcastChange(wsClients, message.table, payload);
            });

            ws.send(JSON.stringify({
              type: 'subscribed',
              table: message.table,
              timestamp: new Date().toISOString()
            }));
          }
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            message: error.message
          }));
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        wsClients.delete(ws);
        console.log('✓ WebSocket client disconnected');
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
      });
    });

    // Start server
    server.listen(PORT, () => {
      console.log(`[START] Tech Turf API running on port ${PORT}`);
      console.log(`[WS] WebSocket real-time available at ws://localhost:${PORT}/ws`);
      console.log(`[STATUS] Real-time status: ${realtimeInitialized ? 'ENABLED' : 'DISABLED'}\n`);
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
