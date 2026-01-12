const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Main Route
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
