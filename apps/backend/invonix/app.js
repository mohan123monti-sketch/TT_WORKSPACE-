import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Router from './utils/Router.js';
import { corsMiddleware } from './middleware/cors.middleware.js';
import routes from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = new Router();

// Include CORS so the Invonix React frontend (port 5173) can call this API
app.use(corsMiddleware);
app.use(routes);

export { app };
