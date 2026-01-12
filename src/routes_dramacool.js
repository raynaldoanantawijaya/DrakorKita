const express = require('express');
const router = express.Router();
const scraper = require('./scraper_dramacool');

// 1. Latest
router.get('/latest', async (req, res) => {
    const data = await scraper.getLatest();
    res.json({ status: true, data });
});

// 2. Search
router.get('/search', async (req, res) => {
    const q = req.query.q;
    if (!q) return res.json({ status: false, message: 'No query' });
    const data = await scraper.getSearch(q);
    res.json({ status: true, data });
});

// 3. Detail
router.get('/detail', async (req, res) => {
    const path = req.query.path;
    if (!path) return res.json({ status: false, message: 'No path' });
    const data = await scraper.getDetail(path);
    res.json({ status: true, data });
});

// 4. Stream (Get Embed URL)
router.get('/stream', async (req, res) => {
    const path = req.query.path;
    if (!path) return res.json({ status: false, message: 'No path' });
    const data = await scraper.getStream(path);
    res.json({ status: true, data });
});

module.exports = router;
