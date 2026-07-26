import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Router from './utils/Router.js';
import routes from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = new Router();

// We skip corsMiddleware and loggerMiddleware here because 
// the main Express app handles CORS and logging globally.

app.use(routes);

export { app };
