/**
 * Real-time Status API Routes
 * Provides information about real-time connections and subscriptions
 */

import express from 'express';
import asyncHandler from 'express-async-handler';
import { getSubscriptions, isRealtimeConnected } from '../../services/realtimeService.js';

const router = express.Router();

// GET real-time status
router.get('/status', asyncHandler((req, res) => {
  const status = {
    realtime: {
      connected: isRealtimeConnected(),
      timestamp: new Date().toISOString(),
      subscriptions: getSubscriptions(),
      protocol: 'WebSocket',
      endpoint: '/ws'
    }
  };

  res.json({
    success: true,
    data: status
  });
}));

// GET usage documentation
router.get('/docs', asyncHandler((req, res) => {
  const docs = {
    title: 'Tech Turf Real-time API Documentation',
    description: 'Real-time database updates via WebSocket using Supabase',
    baseUrl: '/realtime',
    endpoints: {
      status: {
        path: '/status',
        method: 'GET',
        description: 'Get real-time connection status and active subscriptions',
        response: {
          success: true,
          data: {
            realtime: {
              connected: true,
              endpoint: '/ws',
              subscriptions: ['products', 'orders']
            }
          }
        }
      }
    },
    websocket: {
      path: '/ws',
      protocol: 'WebSocket',
      description: 'WebSocket endpoint for real-time database updates',
      messages: {
        subscribe: {
          type: 'subscribe',
          table: 'products',
          description: 'Subscribe to changes in a specific table'
        },
        subscribed: {
          type: 'subscribed',
          table: 'products',
          description: 'Confirmation of subscription'
        },
        db_change: {
          type: 'db_change',
          table: 'products',
          event: 'INSERT|UPDATE|DELETE',
          new: { /* Updated record */ },
          old: { /* Previous record */ },
          description: 'Database change notification'
        },
        error: {
          type: 'error',
          message: 'Error message',
          description: 'Error notification'
        }
      }
    },
    clientExample: {
      javascript: `
// Frontend Example using RealtimeClient
import RealtimeClient from '/src/js/realtime.js';

const realtime = new RealtimeClient();

// Connect to real-time server
await realtime.connect();

// Subscribe to products table changes
realtime.subscribe('products', (change) => {
  console.log('Product updated:', change);
  console.log('Event:', change.event);        // INSERT, UPDATE, DELETE
  console.log('New data:', change.new);       // Updated record
  console.log('Old data:', change.old);       // Previous record
  console.log('Timestamp:', change.timestamp);
});

// Listen to connection events
realtime.on('connected', () => console.log('Connected to real-time'));
realtime.on('disconnected', () => console.log('Disconnected from real-time'));
realtime.on('error', (error) => console.error('Real-time error:', error));

// Unsubscribe when done
realtime.unsubscribe('products', changeCallback);

// Disconnect
realtime.disconnect();
      `
    },
    supabaseSetup: {
      title: 'Supabase Real-time Setup',
      steps: [
        'Go to Supabase Dashboard > Replication',
        'Enable "Realtime" for the publication',
        'Select tables to enable real-time (products, orders, etc)',
        'Add your Supabase credentials to .env file',
        'Restart the backend server'
      ],
      environment_variables: {
        SUPABASE_URL: 'Your Supabase project URL (https://your-project.supabase.co)',
        SUPABASE_ANON_KEY: 'Anon key from Supabase dashboard',
        SUPABASE_SERVICE_KEY: 'Service role key from Supabase dashboard',
        DATABASE_URL: 'PostgreSQL connection string'
      }
    },
    tables_with_realtime: [
      'products - Real-time product inventory and price updates',
      'orders - Order status and updates',
      'users - User profile changes',
      'reviews - New product reviews',
      'inventory - Stock level changes'
    ]
  };

  res.json(docs);
}));

export default router;
