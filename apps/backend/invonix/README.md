# InvonixTT Backend

This is the backend for the **InvonixTT** invoice management system. It is built entirely with raw Node.js (without Express) using a custom MVC architecture and routing engine.

## Architecture

The project follows a standard MVC architecture:
- **`utils/Router.js`**: Custom router parsing URLs and executing middleware.
- **`controllers/`**: Request handlers mapping inputs to business logic.
- **`services/`**: The core business logic and data access layer (currently mocked for easy MySQL swap).
- **`middleware/`**: JWT validation, CORS, and logging.
- **`routes/`**: Route definitions aggregating into `index.js`.

## Setup & Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies (if isolated):
   ```bash
   npm install
   ```
   *(Note: if dependencies are installed in the root workspace, you might just use `npm run dev` from root)*

3. Create environment variables:
   Copy `.env.example` to `.env` and fill in your secrets.
   ```bash
   cp .env.example .env
   ```

## Running the Server

Start in development mode (with watch):
```bash
npm run dev
```

Start in production mode:
```bash
npm start
```

## JWT Authentication Flow
1. Client POSTs credentials to `/api/auth/login`.
2. Server verifies against DB (mocked in `auth.service.js`).
3. Server returns a signed JWT.
4. Client includes `Authorization: Bearer <token>` on all requests to protected routes.
5. The `protect` middleware (`middleware/auth.middleware.js`) decodes the token and appends `req.user`.

## Future MySQL Integration
To integrate MySQL later:
1. Setup a connection pool in `config/db.js`.
2. Open `services/*.service.js` and replace the mock array operations with SQL queries.
3. No changes are required in the Controllers or Routes, preserving the pure MVC boundary!
