import { Hono } from 'hono';
import * as cheerio from 'cheerio';
import scraper from './scraper_worker.js';

const app = new Hono();

// Helper for standardized response
const responseSuccess = (data) => ({ status: true, source: 'drakorindo18', data });
const responseError = (msg) => ({ status: false, source: 'drakorindo18', message: msg });

app.get('/', (c) => c.json({ message: 'Drakorindo API on Cloudflare Worker is Running!' }));

app.get('/api/drakorindo/latest', async (c) => {
    const data = await scraper.getHome();
    return c.json(responseSuccess(data));
});

app.get('/api/drakorindo/search', async (c) => {
    const q = c.req.query('q');
    const page = c.req.query('page') || 1;
    if (!q) return c.json(responseError('Missing q param'), 400);
    const data = await scraper.getSearch(q, page);
    return c.json(responseSuccess(data));
});

app.get('/api/drakorindo/detail/:id', async (c) => {
    const id = c.req.param('id');
    const data = await scraper.getDetail(id);
    if (!data) return c.json(responseError('Not found'), 404);
    return c.json(responseSuccess(data));
});

app.get('/api/drakorindo/stream', async (c) => {
    const url = c.req.query('url');
    if (!url) return c.json(responseError('Missing url param'), 400);

    // Fetch the server.php response directly
    const json = await scraper.fetchJson(url);
    if (!json) return c.json(responseError('Failed to fetch stream data'), 500);

    // Parse server_lists HTML if present
    const alternatives = [];
    if (json.server_lists) {
        const $ = cheerio.load(json.server_lists);
        $('a').each((i, el) => {
            const name = $(el).text().trim();
            const onclick = $(el).attr('onclick');
            if (onclick && onclick.includes('loadVideo')) {
                const args = onclick.match(/'([^']+)'/g);
                if (args && args.length >= 5) {
                    const id = args[0].replace(/'/g, '');
                    alternatives.push({
                        name,
                        type: args[2].replace(/'/g, ''),
                        resolution: args[3].replace(/'/g, ''),
                        server_id: args[4].replace(/'/g, ''),
                        resolve_url: `https://api.drakorkita.cc/c_api/video_p2p.php?is_mob=0&is_uc=0&id=${id}&qua=${args[2].replace(/'/g, '')}&res=${args[3].replace(/'/g, '')}&server_id=${args[4].replace(/'/g, '')}&tag=${args[1].replace(/'/g, '')}&t=${Math.floor(Date.now() / 1000)}&ver=1.08`
                    });
                }
            }
        });
        delete json.server_lists; // Clean up
        json.sources = alternatives;
    }

    return c.json(responseSuccess(json));
});

// Catch-all for other routes (Movies, Series, etc.)
// You can expand this as needed similar to routes.js

export default app;
