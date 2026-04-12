const http = require('http');
http.get('http://localhost:4000/api/projects/2', { headers: { cookie: 'tech_turf_auth=fake' } }, (res) => { // wait, verifyToken relies on cookies or Auth header!
    // I can't hit the API without Auth. I'll just use DB query directly.
});
