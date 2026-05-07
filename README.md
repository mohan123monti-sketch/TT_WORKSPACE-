# TechTurf Production Deployment Guide

## Folder Structure

```
techturf/
├── frontend/
│   └── dist/
├── backend/
│   ├── index.js
│   ├── db.js
│   ├── routes/
│   └── services/
├── storage/
│   ├── techturf.db
│   ├── uploads/
│   └── drive_storage/
├── .env
├── package.json
└── README.md
```

## Deployment Steps

1. **Install dependencies and build frontend**
   ```bash
   cd frontend
   npm ci
   npm run build
   cd ..
   ```
2. **Install backend dependencies**
   ```bash
   cd backend
   npm ci
   cd ..
   ```
3. **Start backend with PM2**
   ```bash
   pm2 start backend/index.js --name techturf-backend
   ```

## NGINX Example Config

```
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/employee;
    location / {
        try_files $uri /index.html;
    }
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Security
- `.env`, `storage/`, and logs are ignored by git and not served by NGINX.
- Database and uploads are not publicly accessible.

## Validation Checklist
- [ ] Frontend loads correctly
- [ ] API works via `/api`
- [ ] Database connects
- [ ] File uploads work
- [ ] No broken imports
