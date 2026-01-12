const cheerio = require('cheerio');
const axios = require('axios');
const { normalizeSlug, parseViews, extractIdFromUrl } = require('./utils');
const { HttpsProxyAgent } = require('https-proxy-agent'); // Supports HTTP/HTTPS proxies

// Authenticated Proxy (Webshare)
const PROXY_URL = 'http://ikipfdis:z7x7yl9x6szs@142.111.48.253:7030';

class DrakorScraper {
    constructor() {
        this.baseUrl = 'https://drakorindo18.mywap.blog';
        this.apiBase = 'https://api.drakorkita.cc/c_api';

        // Axios Config with Proxy Agent
        this.axiosInstance = axios.create({
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://drakorindo18.mywap.blog'
            },
            httpsAgent: new HttpsProxyAgent(PROXY_URL),
            timeout: 15000 // 15s timeout
        });
    }

    async fetchHtml(url) {
        try {
            const response = await this.axiosInstance.get(url);
            return response.data;
        } catch (error) {
            console.error(`Error fetching ${url}:`, error.message);
            if (error.response) {
                console.error('Status:', error.response.status);
            }
            return null;
        }
    }

    async fetchJson(url) {
        try {
            const response = await this.axiosInstance.get(url, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            return response.data;
        } catch (error) {
            console.error(`Error fetching JSON ${url}:`, error.message);
            return null;
        }
    }

    extractList($) {
        const items = [];
        $('a.poster').each((i, el) => {
            const $el = $(el);
            const title = $el.find('.titit').text().trim();
            const poster = $el.find('img.poster').attr('src');
            const url = $el.attr('href');
            const id = normalizeSlug(url);
            const type = $el.find('.type').text().trim();
            const statusRaw = $el.find('.rate').text().trim();
            const rating = $el.find('.rat').text().trim();

            if (title && url) {
                items.push({
                    id,
                    title,
                    type: type.toLowerCase().includes('movie') ? 'movie' : 'series',
                    status: statusRaw.includes('END') ? 'complete' : 'ongoing',
                    poster: poster ? (poster.startsWith('http') ? poster : this.baseUrl + poster) : null,
                    rating: rating || null,
                    last_episode: statusRaw
                });
            }
        });
        return items;
    }

    async getHome() {
        // Home usually doesn't have standard pagination like /all
        const html = await this.fetchHtml(this.baseUrl);
        if (!html) return [];
        const $ = cheerio.load(html);
        return this.extractList($);
    }

    async getSearch(query, page = 1) {
        let url = `${this.baseUrl}/all?q=${encodeURIComponent(query)}`;
        if (page > 1) url += `&page=${page}`;

        const html = await this.fetchHtml(url);
        if (!html) return [];
        const $ = cheerio.load(html);
        return this.extractList($);
    }

    async getByPath(path, page = 1) {
        let url = `${this.baseUrl}${path}`;
        // Handle existing query params
        if (page > 1) {
            url += (url.includes('?') ? '&' : '?') + `page=${page}`;
        }

        const html = await this.fetchHtml(url);
        if (!html) return [];
        const $ = cheerio.load(html);
        return this.extractList($);
    }

    async getDetail(id) {
        const url = `${this.baseUrl}/detail/${id}`;
        const html = await this.fetchHtml(url);
        if (!html) { console.log('[Scraper] HTML is null/empty'); return null; }
        console.log(`[Scraper] Fetched ${url} - Length: ${html.length}`);
        const $ = cheerio.load(html);

        // Metadata Extraction
        const title = $('.breadcrumb li.active').text().trim() || $('h1').text().trim();
        const poster = $('img.poster, .img-thumbnail').attr('src');

        let synopsis = '';
        $('b, h3, strong').each((i, el) => {
            if ($(el).text().includes('Sinopsis')) {
                synopsis = $(el.nextSibling)?.nodeValue || $(el).parent().text().replace('Sinopsis', '').trim();
                if (synopsis.length < 5) synopsis = $(el).next().text().trim();
            }
        });
        if (synopsis) synopsis = synopsis.replace(title, '').trim();

        const type = $('div:contains("Type:")').text().replace('Type:', '').trim() || 'series';
        const status = $('div:contains("Status:")').text().replace('Status:', '').trim().toLowerCase();
        const genres = [];
        $('.breadcrumb a').each((i, el) => {
            const t = $(el).text().trim();
            if (t && t !== 'Home') genres.push(t);
        });

        const views = parseViews($('div:contains("Views:")').text().replace('Views:', '').trim());

        // --- NETWORK LEVEL EPISODE EXTRACTION ---
        let episodes = [];

        // 1. Extract Vars
        // Use raw html string to avoid likely Cheerio parsing issues with the script tag
        const loadEpMatch = html.match(/loadEpisode\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/);

        if (loadEpMatch) {
            const movieId = loadEpMatch[1];
            const tag = loadEpMatch[2];
            console.log(`[Scraper] Found movie_id: ${movieId}, tag: ${tag}`);
            const t = Math.floor(Date.now() / 1000);

            // 2. Call Internal API
            // https://api.drakorkita.cc/c_api/episode.php?is_mob=0&is_uc=0&movie_id=...
            const apiUrl = `${this.apiBase}/episode.php?is_mob=0&is_uc=0&movie_id=${movieId}&tag=${tag}&t=${t}&ver=1.08`;

            const json = await this.fetchJson(apiUrl);
            if (json && json.episode_lists) {
                // 3. Parse HTML in JSON
                const $ep = cheerio.load(json.episode_lists);
                $ep('a').each((i, el) => {
                    const txt = $ep(el).text().trim();
                    const onclick = $ep(el).attr('onclick');
                    // loadServer('pHtb6y7LQORv','708aab6f6553a34f80509a8f906eb0b7','server_loc','f1')
                    if (onclick) {
                        const args = onclick.match(/'([^']+)'/g);
                        if (args && args.length >= 4) {
                            const epId = args[0].replace(/'/g, '');
                            // const tag = args[1].replace(/'/g, '');
                            const serverXid = args[3].replace(/'/g, '');

                            // Construct the next-step URL (Server selection / Stream info)
                            episodes.push({
                                episode: txt,
                                // Directing user to the endpoint that yields stream info
                                url: `${this.apiBase}/server.php?is_mob=0&is_uc=0&episode_id=${epId}&tag=${tag}&server_xid=${serverXid}&t=${t}&ver=1.08`
                            });
                        }
                    }
                });
            }
        } else {
            // Fallback: Check if static page numbers exist (sometimes case for old series?)
            $('.post-page-numbers').each((i, el) => {
                const txt = $(el).text().trim();
                if (/^\d+$/.test(txt)) {
                    episodes.push({ episode: txt, url: 'javascript:;' });
                }
            });
        }

        // Clean & Sort
        const cleanEpisodes = [];
        const seen = new Set();
        episodes.forEach(e => {
            if (!seen.has(e.episode)) {
                cleanEpisodes.push(e);
                seen.add(e.episode);
            }
        });
        cleanEpisodes.sort((a, b) => parseInt(a.episode) - parseInt(b.episode));

        return {
            id,
            title,
            type: type.toLowerCase().includes('movie') ? 'movie' : 'series',
            status: status.includes('ongoing') ? 'ongoing' : 'complete',
            genres: [...new Set(genres)],
            synopsis,
            poster: poster ? (poster.startsWith('http') ? poster : this.baseUrl + poster) : null,
            views,
            episodes: cleanEpisodes
        };
    }
}

module.exports = new DrakorScraper();
