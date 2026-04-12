const http = require('http');

const data = JSON.stringify({
    title: "Test Update",
    team_members: [2, 3]
});

const req = http.request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/projects/2',
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        // I need a valid token! Wait, I don't have a token.
        // Let's do it via require('express') router? No, Express routes can't be easily invoked outside.
    }
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
