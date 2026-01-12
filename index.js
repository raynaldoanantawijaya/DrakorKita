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
