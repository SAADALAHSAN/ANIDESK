const fs = require('fs');
const js = fs.readFileSync('E:/enma_bundle.js', 'utf8');

// Find API endpoints and backends
const urlMatches = js.match(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[a-zA-Z0-9_\/.-]*/g) || [];
const filtered = Array.from(new Set(urlMatches.filter(u => 
  !u.includes('w3.org') && 
  !u.includes('schema.org') && 
  !u.includes('fonts.googleapis') && 
  !u.includes('cdnjs.cloudflare')
)));

console.log('--- FOUND URLS ---');
console.log(filtered.slice(0, 30));

console.log('--- PLAYER LIBS ---');
console.log('Artplayer:', js.includes('Artplayer') || js.includes('artplayer'));
console.log('HLS.js:', js.includes('hls.js') || js.includes('Hls(') || js.includes('new Hls'));
console.log('Plyr:', js.includes('plyr') || js.includes('Plyr'));
console.log('VideoJS:', js.includes('videojs') || js.includes('video.js'));

// Search for server resolution or streaming
const serverMatches = js.match(/server[s]?|provider[s]?|stream[s]?/gi) || [];
console.log('Server mentions count:', serverMatches.length);

// Look for routes/pages
const routes = js.match(/path:\s*["'][^"']+["']/g) || [];
console.log('--- ROUTES ---');
console.log(routes.slice(0, 20));
