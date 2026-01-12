const express = require('express');
const router = express.Router();
const scraper = require('./scraper');
const { responseSuccess, responseError, extractIdFromUrl } = require('./utils');
// const apicache = require('apicache'); // DISABLED for Serverless compatibility

// Cache configuration - DISABLED for now
// const cache = apicache.middleware;
const cache = () => (req, res, next) => next(); // Passthrough middleware

// 1. GET /vip - Trending
router.get('/vip', cache('1 hour'), async (req, res) => {
    try {
        // Trending is on the home page sidebar usually, distinct from latest.
        // For now we map it to "most viewed" if we can distinguish, otherwise /all ordered?
        // The scraper currently scrapes the *grid*. 
        // The home page grid is usually "Latest".
        // "Most Viewed" is a sidebar list.
        // To implement strict /vip, we might need a specific scraper method for the sidebar.
        // For MVP, returning the Home Grid as "Trending" or "Latest" is acceptable.
        // Let's explicitly use getHome for "Latest" and maybe reuse it for VIP or distinct if needed.
        const data = await scraper.getHome();
        // Filter by views if possible? no views in home grid usually.
        // We'll return the home grid.
        res.json(responseSuccess(data));
    } catch (err) {
        res.status(500).json(responseError(err.message));
    }
});

// 2. GET /latest
router.get('/latest', cache('10 minutes'), async (req, res) => {
    try {
        const data = await scraper.getHome();
        res.json(responseSuccess(data));
    } catch (err) {
        res.status(500).json(responseError(err.message));
    }
});

// 3. GET /all
router.get('/all', cache('1 hour'), async (req, res) => {
    try {
        const page = req.query.page || 1;
        const data = await scraper.getByPath('/all', page);
        res.json(responseSuccess(data));
    } catch (err) {
        res.status(500).json(responseError(err.message));
    }
});

// 4. GET /series
router.get('/series', cache('1 hour'), async (req, res) => {
    try {
        const page = req.query.page || 1;
        const data = await scraper.getByPath('/all?media_type=tv', page);
        res.json(responseSuccess(data));
    } catch (err) {
        res.status(500).json(responseError(err.message));
    }
});

// 5. GET /movie
router.get('/movie', cache('1 hour'), async (req, res) => {
    try {
        const page = req.query.page || 1;
        const data = await scraper.getByPath('/all?media_type=movie', page);
        res.json(responseSuccess(data));
    } catch (err) {
        res.status(500).json(responseError(err.message));
    }
});

// 6. GET /complete
router.get('/complete', cache('1 hour'), async (req, res) => {
    try {
        const page = req.query.page || 1;
        const data = await scraper.getByPath('/all?status=ended', page);
        res.json(responseSuccess(data));
    } catch (err) {
        res.status(500).json(responseError(err.message));
    }
});

// 7. GET /ongoing
router.get('/ongoing', cache('1 hour'), async (req, res) => {
    try {
        const page = req.query.page || 1;
        const data = await scraper.getByPath('/all?status=returning%20series', page);
        res.json(responseSuccess(data));
    } catch (err) {
        res.status(500).json(responseError(err.message));
    }
});

// 8. GET /genre/:genre
router.get('/genre/:genre', cache('1 hour'), async (req, res) => {
    try {
        const page = req.query.page || 1;
        const genre = req.params.genre;
        const data = await scraper.getByPath(`/all?genre=${encodeURIComponent(genre)}`, page);
        res.json(responseSuccess(data));
    } catch (err) {
        res.status(500).json(responseError(err.message));
    }
});

// 9. GET /detail/:id
router.get('/detail/:id', cache('1 hour'), async (req, res) => {
    try {
        const id = req.params.id;
        const data = await scraper.getDetail(id);
        if (!data) return res.status(404).json(responseError('Not found'));
        res.json(responseSuccess(data));
    } catch (err) {
        res.status(500).json(responseError(err.message));
    }
});

// 10. GET /search
router.get('/search', cache('10 minutes'), async (req, res) => {
    try {
        const q = req.query.q;
        const page = req.query.page || 1;
        if (!q) return res.status(400).json(responseError('Missing query param q'));
        const data = await scraper.getSearch(q, page);
        res.json(responseSuccess(data));
    } catch (err) {
        res.status(500).json(responseError(err.message));
    }
});

// 11. GET /stream (Resolve final video)
router.get('/stream', cache('5 minutes'), async (req, res) => {
    try {
        const targetUrl = req.query.url;
        if (!targetUrl) return res.status(400).json(responseError('Missing url param'));

        if (!targetUrl.includes('api.drakorkita.cc')) {
            return res.status(400).json(responseError('Invalid URL domain'));
        }

        const json = await scraper.fetchJson(targetUrl);

        // Parse server_lists to find alternatives
        const alternatives = [];
        if (json.server_lists) {
            const cheerio = require('cheerio');
            const $ = cheerio.load(json.server_lists);

            $('a').each((i, el) => {
                const name = $(el).text().trim();
                const onclick = $(el).attr('onclick');
                // console.log(`[Stream Debug] Link ${i}: ${onclick}`);
                if (onclick && onclick.includes('loadVideo')) {
                    const args = onclick.match(/'([^']+)'/g);
                    if (args && args.length >= 5) {
                        const id = args[0].replace(/'/g, '');
                        // ...
                        alternatives.push({
                            name,
                            type: args[2].replace(/'/g, ''),
                            resolution: args[3].replace(/'/g, ''),
                            server_id: args[4].replace(/'/g, ''),
                            resolve_url: `https://api.drakorkita.cc/c_api/video_p2p.php?is_mob=0&is_uc=0&id=${id}&qua=${args[2].replace(/'/g, '')}&res=${args[3].replace(/'/g, '')}&server_id=${args[4].replace(/'/g, '')}&tag=${args[1].replace(/'/g, '')}&t=${Math.floor(Date.now() / 1000)}&ver=1.08`
                        });
                    } else {
                        console.log(`[Stream Debug] Args mismatch: ${args ? args.length : 0}`);
                    }
                }
            });
            console.log(`[Stream Debug] Alternatives found: ${alternatives.length}`);
        }

        // Add alternatives to the response
        if (json) {
            delete json.server_lists; // Reduce valid payload size
            json.sources = alternatives;
        }

        res.json(responseSuccess(json));
    } catch (err) {
        res.status(500).json(responseError(err.message));
    }
});

module.exports = router;
