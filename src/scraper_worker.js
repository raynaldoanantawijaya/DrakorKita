import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Hardcoded Proxy (User Provided)
const PROXY_URL = 'http://ikipfdis:z7x7yl9x6szs@142.111.48.253:7030';
const proxyAgent = new HttpsProxyAgent(PROXY_URL);

// Helper Utils (Inline)
function normalizeSlug(slug) {
    if (!slug) return null;
    if (slug.startsWith('https://')) {
        const parts = slug.split('/');
        // Handle URLs like /detail/taxi-driver/
        const detailIndex = parts.indexOf('detail');
        if (detailIndex !== -1 && parts[detailIndex + 1]) {
            slug = parts[detailIndex + 1];
        } else {
            slug = parts[parts.length - 2] || parts[parts.length - 1]; // Fallback
        }
    }
    return slug.replace(/\/$/, '');
}

function parseViews(text) {
    if (!text) return 0;
    const clean = text.replace(/[^0-9]/g, '');
    return parseInt(clean, 10) || 0;
}

function extractIdFromUrl(url) {
    if (!url) return null;
    try {
        const u = new URL(url);
        return u.searchParams.get('id');
    } catch (e) { return null; }
}

// Scraper Class (ESM Version for Worker)
class DrakorScraper {
    constructor() {
        this.baseUrl = 'https://drakorindo18.mywap.blog';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://drakorindo18.mywap.blog'
        };
    }

    async fetchHtml(url) {
        try {
            const res = await fetch(url, {
                headers: this.headers,
                agent: proxyAgent
            });
            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
            return await res.text();
        } catch (e) {
            console.error(`Fetch error: ${e.message}`);
            return null;
        }
    }

    async fetchJson(url) {
        try {
            const res = await fetch(url, {
                headers: { ...this.headers, 'X-Requested-With': 'XMLHttpRequest' },
                agent: proxyAgent
            });
            if (!res.ok) throw new Error(`Fetch JSON failed: ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error(`Fetch JSON error: ${e.message}`);
            return null;
        }
    }

    // --- Core Scraper Methods ---

    async getHome() {
        const html = await this.fetchHtml(this.baseUrl);
        if (!html) return [];
        const $ = cheerio.load(html);
        const results = [];

        $('a.poster').each((i, el) => {
            const title = $(el).find('.titit').text().trim();
            const link = $(el).attr('href');
            const poster = $(el).find('img').attr('src');
            const type = $(el).find('.type').text().trim();
            const note = $(el).find('.rate').text().trim(); // Episode / Status
            const rating = $(el).find('.rat').text().trim();

            if (title && link) {
                results.push({
                    title,
                    id: normalizeSlug(link),
                    poster: poster ? (poster.startsWith('//') ? 'https:' + poster : poster) : null,
                    type,
                    status: note,
                    rating: parseFloat(rating) || 0,
                    link
                });
            }
        });
        return results;
    }

    async getDetail(id) {
        const url = `${this.baseUrl}/detail/${id}/`;
        const html = await this.fetchHtml(url);
        if (!html) return null;
        const $ = cheerio.load(html);

        const title = $('h1.title-poster').text().trim();
        const poster = $('.poster-img img').attr('src');
        const synopsis = $('.synopsis').text().trim();
        const viewsStr = $('.views').text() || '';
        const views = parseViews(viewsStr);

        let type = 'Unknown';
        let status = 'Unknown';
        const genres = [];

        $('.new-info-card').each((i, el) => {
            const text = $(el).text();
            if (text.includes('Jenis:')) type = $(el).find('a').text().trim();
            if (text.includes('Status:')) status = $(el).find('a').text().trim();
            if (text.includes('Genre:')) {
                $(el).find('a').each((_, a) => genres.push($(a).text().trim()));
            }
        });

        // Episode Extraction (Network Logic)
        let episodes = [];
        const movieIdMatch = html.match(/loadEpisode\('([^']+)'/);
        const tagMatch = html.match(/loadEpisode\('[^']+',\s*'([^']+)'/);

        if (movieIdMatch && tagMatch) {
            const movieId = movieIdMatch[1];
            const tag = tagMatch[1];
            // Fetch Episodes from internal API
            const epUrl = `https://api.drakorkita.cc/c_api/episode.php?is_mob=0&is_uc=0&movie_id=${movieId}&tag=${tag}&t=${Math.floor(Date.now() / 1000)}&ver=1.08`;
            const json = await this.fetchJson(epUrl);

            if (json && json.episode_lists) {
                const $ep = cheerio.load(json.episode_lists);
                $ep('a.btn-svr').each((i, el) => {
                    episodes.push({
                        episode: $(el).text().trim(),
                        url: $(el).attr('href') // This is the link to server.php
                    });
                });
            }
        }

        return {
            id,
            title,
            type,
            status,
            genres,
            synopsis,
            poster: poster ? (poster.startsWith('//') ? 'https:' + poster : poster) : null,
            views,
            episodes
        };
    }

    async getSearch(query, page = 1) {
        const url = `${this.baseUrl}/page/${page}/?s=${encodeURIComponent(query)}`;
        const html = await this.fetchHtml(url);
        if (!html) return [];
        const $ = cheerio.load(html);
        const results = [];

        $('a.poster').each((i, el) => {
            const title = $(el).find('.titit').text().trim();
            const link = $(el).attr('href');
            const poster = $(el).find('img').attr('src');
            if (title && link) {
                results.push({
                    title,
                    id: normalizeSlug(link),
                    poster: poster ? (poster.startsWith('//') ? 'https:' + poster : poster) : null,
                    type: $(el).find('.type').text().trim(),
                    status: $(el).find('.rate').text().trim(),
                    rating: $(el).find('.rat').text().trim()
                });
            }
        });
        return results;
    }

    async getByPath(path, page = 1) {
        // Handle pagination logic of the site
        // If path already has query params, append &page=... ? 
        // Site structure: /all/page/2/ or /genre/action/page/2/

        let url = `${this.baseUrl}${path}`;
        if (page > 1) {
            // Basic heuristic for common WP pagination
            if (url.endsWith('/')) url += `page/${page}/`;
            else url += `/page/${page}/`;
        }

        const html = await this.fetchHtml(url);
        if (!html) return [];
        const $ = cheerio.load(html);
        const results = [];

        $('a.poster').each((i, el) => {
            const title = $(el).find('.titit').text().trim();
            const link = $(el).attr('href');
            const poster = $(el).find('img').attr('src');
            if (title && link) {
                results.push({
                    title,
                    id: normalizeSlug(link),
                    poster: poster ? (poster.startsWith('//') ? 'https:' + poster : poster) : null,
                    type: $(el).find('.type').text().trim(),
                    status: $(el).find('.rate').text().trim(),
                    rating: $(el).find('.rat').text().trim()
                });
            }
        });
        return results;
    }
}

export default new DrakorScraper();
