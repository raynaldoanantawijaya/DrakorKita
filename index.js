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

app.get('/', (req, res) => {
    res.json({ message: 'Root of API', url: req.url });
});

app.get('/debug', (req, res) => {
    res.json({
        message: 'Debug endpoint',
        receivedUrl: req.url,
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl
    });
});

// Main Route
const routes = require('./routes');
app.use('/api/drakorindo', routes);

// 404
app.use((req, res) => {
    res.status(404).json({
        status: false,
        message: 'Endpoint not found'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Test: http://localhost:${PORT}/api/drakorindo/latest`);
});

module.exports = app;
