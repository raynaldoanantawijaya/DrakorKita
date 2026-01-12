const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Debugging Middleware
app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
});

// ULTIMATE HEALTH CHECK
app.get('/health', (req, res) => {
    res.status(200).send('Server is Clean and Running (Express v4)');
});

app.get('/', (req, res) => {
    res.json({ message: 'Root of API (Isolated)' });
});

// Serve the Test Player at /test
app.get('/test', (req, res) => {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Drakor API Test Player</title>
    <style>
        body { font-family: monospace; background: #eee; color: #333; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        h1 { margin-top: 0; }
        .section { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #ddd; }
        button { cursor: pointer; padding: 5px 10px; background: #333; color: white; border: none; font-family: monospace; }
        button:hover { background: #555; }
        input { padding: 5px; width: 300px; font-family: monospace; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; margin-top: 10px; }
        .card { cursor: pointer; border: 1px solid #ddd; padding: 5px; text-align: center; }
        .card:hover { background: #f9f9f9; border-color: #333; }
        .card img { max-width: 100%; height: auto; }
        .card h4 { font-size: 12px; margin: 5px 0 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        #debug { background: #f0f0f0; padding: 10px; white-space: pre-wrap; font-size: 11px; max-height: 200px; overflow-y: auto; display: none; }
        .error { color: red; font-weight: bold; }
        video { width: 100%; margin-top: 10px; background: black; }
        .ep-list { display: flex; flex-wrap: wrap; gap: 5px; }
        .ep-btn { background: #fff; border: 1px solid #333; color: #333; }
        .ep-btn:hover { background: #eee; }
        .loading { opacity: 0.5; pointer-events: none; }
        #player-container { display: none; text-align: center; padding: 10px; background: #000; color: #fff; margin-top:10px; border-radius: 4px;}
    </style>
</head>
<body>

<div class="container">
    <div class="section">
        <h3>1. API Config</h3>
        <input type="text" id="apiUrl" value="/api/drakorindo" placeholder="API Base URL">
        <button onclick="fetchLatest()">Load Latest Dramas</button>
        <div id="status" style="margin-top: 5px;"></div>
    </div>

    <!-- Latest List -->
    <div id="listSection" class="section" style="display:none;">
        <h3>Latest Dramas</h3>
        <div id="dramaGrid" class="grid"></div>
    </div>

    <!-- Detail View -->
    <div id="detailSection" class="section" style="display:none;">
        <button onclick="backToList()">Back to List</button>
        <h2 id="dramaTitle">Title</h2>
        <div style="display: flex; gap: 20px;">
            <img id="dramaPoster" src="" style="width: 150px;">
            <div>
                <p><strong>Status:</strong> <span id="dramaStatus">-</span></p>
                <p><strong>Rating:</strong> <span id="dramaRating">-</span></p>
                <div id="epContainer">
                    <h4>Episodes</h4>
                    <div id="epList" class="ep-list"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Player -->
    <div id="playerSection" class="section" style="display:none;">
        <h3>Video Player</h3>
        <div id="player-container">
            <p id="player-msg">Resolving Video...</p>
            <video id="videoPlayer" controls playsinline></video>
        </div>
        <div id="debug"></div>
    </div>
</div>

<script>
    const el = (id) => document.getElementById(id);
    const log = (msg, isError) => {
        const d = el('debug');
        d.style.display = 'block';
        d.innerHTML += \`<div class="\${isError?'error':''}">\${msg}</div>\`;
        d.scrollTop = d.scrollHeight;
        console.log(msg);
    };

    async function fetchLatest() {
        const baseUrl = el('apiUrl').value;
        const grid = el('dramaGrid');
        grid.innerHTML = 'Loading...';
        el('listSection').style.display = 'block';
        el('detailSection').style.display = 'none';
        el('playerSection').style.display = 'none';

        try {
            const res = await fetch(\`\${baseUrl}/latest\`);
            const json = await res.json();
            
            if (!json.status) throw new Error('API returned false status');
            
            grid.innerHTML = '';
            json.data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'card';
                div.innerHTML = \`
                    <img src="\${item.poster}" alt="poster">
                    <h4>\${item.title}</h4>
                \`;
                div.onclick = () => loadDetail(item.id);
                grid.appendChild(div);
            });
        } catch (e) {
            grid.innerHTML = \`<div class="error">Error: \${e.message}</div>\`;
        }
    }

    function backToList() {
        el('listSection').style.display = 'block';
        el('detailSection').style.display = 'none';
        el('playerSection').style.display = 'none';
        el('videoPlayer').pause();
        el('videoPlayer').src = "";
    }

    async function loadDetail(id) {
        const baseUrl = el('apiUrl').value;
        el('listSection').style.display = 'none';
        el('detailSection').style.display = 'block';
        el('dramaTitle').innerText = 'Loading...';
        el('epList').innerHTML = '';

        try {
            const res = await fetch(\`\${baseUrl}/detail/\${id}\`);
            const json = await res.json();
            
            if (!json.status) throw new Error('Detail API Error');
            const data = json.data;

            el('dramaTitle').innerText = data.title;
            el('dramaPoster').src = data.poster;
            el('dramaStatus').innerText = data.status;
            el('dramaRating').innerText = data.rating;

            const eps = data.episodes || [];
            if (eps.length === 0) {
                el('epList').innerHTML = 'No episodes found.';
                return;
            }

            eps.forEach(ep => {
                const btn = document.createElement('button');
                btn.className = 'ep-btn';
                btn.innerText = \`Ep \${ep.episode}\`;
                btn.onclick = () => playEpisode(ep.url);
                el('epList').appendChild(btn);
            });

        } catch (e) {
            alert('Error loading detail: ' + e.message);
            backToList();
        }
    }

    async function playEpisode(url) {
        const baseUrl = el('apiUrl').value;
        el('playerSection').style.display = 'block';
        el('player-container').style.display = 'block';
        el('player-msg').innerText = '1. Getting Stream URL from API...';
        el('debug').innerHTML = '';
        el('videoPlayer').style.display = 'none';

        try {
            const streamRes = await fetch(\`\${baseUrl}/stream?url=\${encodeURIComponent(url)}\`);
            const streamJson = await streamRes.json();
            
            if (!streamJson.status) throw new Error('Stream API Failed');
            
            // Fix: Extract resolve_url from sources array correctly
            const sources = streamJson.data && streamJson.data.sources;
            if (!sources || sources.length === 0) throw new Error('No sources found in API response');

            const resolveUrl = sources[0].resolve_url;
            log(\`Resolve URL: \${resolveUrl}\`);

            el('player-msg').innerText = '2. Unwrapping Video (Client-Side)...';
            
            const targetRes = await fetch(resolveUrl);
            const targetJson = await targetRes.json();
            log('Target Response: ' + JSON.stringify(targetJson, null, 2));

            let finalVideoUrl = "";
            
            if (targetJson.p2p_url) {
                finalVideoUrl = targetJson.p2p_url;
            } else if (targetJson.sources && targetJson.sources.length > 0) {
                finalVideoUrl = targetJson.sources[0].file;
            }

            if (!finalVideoUrl) throw new Error('No video URL found in target response');

            // IFRAME STRATEGY (Final Fallback)
            el('player-msg').innerText = 'Playing via Embed...';
            el('videoPlayer').style.display = 'none'; 
            
            let iframe = document.getElementById('iframePlayer');
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.id = 'iframePlayer';
                iframe.style.width = '100%';
                iframe.style.height = '450px';
                iframe.style.border = 'none';
                iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
                iframe.allowFullscreen = true;
                el('player-container').appendChild(iframe);
            }
            
            if (finalVideoUrl.includes('.stream/') || finalVideoUrl.includes('#')) {
                 iframe.src = finalVideoUrl;
                 iframe.style.display = 'block';
            } else {
                 el('videoPlayer').src = finalVideoUrl;
                 el('videoPlayer').style.display = 'block';
                 iframe.style.display = 'none';
                 el('videoPlayer').play();
            }

        } catch (e) {
            log(e.message, true);
            el('player-msg').innerText = \`Error: \${e.message}. Check Debug Log below.\`;
            
            if (e.message.includes('Failed to fetch')) {
                 el('debug').innerHTML += \`<div class="error">
                 <br><strong>CORS ERROR DETECTED!</strong>
                 <br>The browser blocked the request to api.drakorkita.cc.
                 <br>This confirms that Client-Side fetching is also blocked by CORS policy.
                 <br>You need a CORS Proxy (like cors-anywhere) or the Target Server strictly blocks external origins.
                 </div>\`;
            }
        }
    }
</script>

</body>
</html>
    `;
    res.send(html);
});

app.get('/debug', (req, res) => {
    res.json({
        message: 'Debug endpoint',
        receivedUrl: req.url,
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl
    });
});

// TEST CHEERIO ISOLATION
app.get('/test-cheerio', (req, res) => {
    try {
        const cheerio = require('cheerio');
        const $ = cheerio.load('<html><body><h1>Hello</h1></body></html>');
        const text = $('h1').text();
        res.json({ status: 'OK', cheerio: 'loaded', parsed: text });
    } catch (err) {
        res.status(500).json({ status: 'FAIL', error: err.message, stack: err.stack });
    }
});

// Diagnose Route (Testing)
app.use('/diagnose', require('./diagnose'));

// TEST DYNAMIC SCRAPER LOAD
app.get('/test-scraper', async (req, res) => {
    try {
        const scraper = require('./scraper');
        res.json({ status: 'Scraper loaded', type: typeof scraper });
    } catch (err) {
        res.status(500).json({
            status: 'SCRAPER LOAD FAILED',
            error: err.message,
            stack: err.stack
        });
    }
});

// TEST DYNAMIC ROUTES LOAD
app.get('/test-routes', async (req, res) => {
    try {
        const routes = require('./routes');
        res.json({ status: 'Routes loaded', type: typeof routes });
    } catch (err) {
        res.status(500).json({
            status: 'ROUTES LOAD FAILED',
            error: err.message,
            stack: err.stack
        });
    }
});

// Main Route - LAZY LOADED to avoid cold-start crash
let routesLoaded = null;
app.use('/api/drakorindo', (req, res, next) => {
    if (!routesLoaded) {
        try {
            routesLoaded = require('./routes');
        } catch (err) {
            return res.status(500).json({ error: 'Failed to load routes', message: err.message });
        }
    }
    routesLoaded(req, res, next);
});

// 404
app.use((req, res) => {
    res.status(404).json({
        status: false,
        message: 'Endpoint not found'
    });
});

// Only listen if run directly (Localhost)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Test: http://localhost:${PORT}/api/drakorindo/latest`);
    });
}

module.exports = app;
