import { parseJSONBody } from './requestParser.js';
import { sendError } from './responseFormatter.js';
import url from 'url';

export default class Router {
  constructor() {
    this.routes = [];
    this.middlewares = [];
  }

  use(middleware) {
    if (middleware instanceof Router) {
      // If it's a sub-router, merge its routes
      middleware.routes.forEach(r => this.routes.push(r));
    } else {
      this.middlewares.push(middleware);
    }
  }

  addRoute(method, path, middlewares, handler) {
    this.routes.push({
      method,
      path,
      middlewares: Array.isArray(middlewares) ? middlewares : [],
      handler: typeof middlewares === 'function' ? middlewares : handler
    });
  }

  get(path, ...handlers) {
    const handler = handlers.pop();
    this.addRoute('GET', path, handlers, handler);
  }

  post(path, ...handlers) {
    const handler = handlers.pop();
    this.addRoute('POST', path, handlers, handler);
  }

  put(path, ...handlers) {
    const handler = handlers.pop();
    this.addRoute('PUT', path, handlers, handler);
  }

  delete(path, ...handlers) {
    const handler = handlers.pop();
    this.addRoute('DELETE', path, handlers, handler);
  }

  matchRoute(reqMethod, reqPath) {
    for (const route of this.routes) {
      if (route.method === reqMethod) {
        // Convert express-style :id to regex
        const paramNames = [];
        const regexPath = route.path.replace(/:([^\/]+)/g, (_, paramName) => {
          paramNames.push(paramName);
          return '([^\\/]+)';
        });
        
        const regex = new RegExp(`^${regexPath}$`);
        const match = reqPath.match(regex);

        if (match) {
          const params = {};
          paramNames.forEach((name, index) => {
            params[name] = match[index + 1];
          });
          return { route, params };
        }
      }
    }
    return null;
  }

  async handle(req, res) {
    try {
      // Execute global middlewares (e.g., CORS, Logger)
      for (const middleware of this.middlewares) {
        let middlewareDone = false;
        await new Promise((resolve, reject) => {
          middleware(req, res, (err) => {
            if (err) return reject(err);
            middlewareDone = true;
            resolve();
          });
        });
      }

      const parsedUrl = url.parse(req.url, true);
      const reqPath = parsedUrl.pathname;
      req.query = parsedUrl.query;

      const matched = this.matchRoute(req.method, reqPath);

      if (matched) {
        req.params = matched.params;

        // Parse JSON Body for POST/PUT
        if (req.method === 'POST' || req.method === 'PUT') {
          req.body = await parseJSONBody(req);
        }

        // Execute route-specific middlewares
        for (const middleware of matched.route.middlewares) {
          let middlewarePassed = false;
          await new Promise((resolve, reject) => {
            middleware(req, res, (err) => {
              if (err) return reject(err);
              middlewarePassed = true;
              resolve();
            });
          });
        }

        // Execute controller handler
        await matched.route.handler(req, res);
      } else {
        // Only return 404 if it's an API route (not OPTIONS which is handled by CORS)
        if (req.method !== 'OPTIONS') {
          sendError(res, 404, 'API Route Not Found');
        }
      }
    } catch (error) {
      console.error('Router Error:', error);
      sendError(res, 500, error.message || 'Internal Server Error');
    }
  }
}
