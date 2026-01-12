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

// Diagnose Route (Testing)
app.use('/diagnose', require('./diagnose'));

// TEMPORARY: Comment out heavy routes to isolate crash source
// const routes = require('./routes');
// app.use('/api/drakorindo', routes);

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
