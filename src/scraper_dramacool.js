const axios = require('axios');
const cheerio = require('cheerio');
const { HttpsProxyAgent } = require('https-proxy-agent');

class DramacoolScraper {
    constructor() {
        // Changed to asianc.sh - often more stable mirror than dramacool.bg
        this.baseUrl = 'https://asianc.sh';

        // Proxy Config (Optional - can be toggled)
        // const PROXY_URL = 'http://ikipfdis:z7x7yl9x6szs@198.105.121.200:6462';

        this.client = axios.create({
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': this.baseUrl
            },
            // httpsAgent: new HttpsProxyAgent(PROXY_URL), // Uncomment if needed
            timeout: 30000, // 30s timeout
            rejectUnauthorized: false // Bypass SSL errors
        });
    }

    async getLatest(page = 1) {
        try {
            const url = `${this.baseUrl}/recently-added?page=${page}`;
            console.log(`Scraping Latest: ${url}`);
            const { data } = await this.client.get(url);
            const $ = cheerio.load(data);

            const results = [];
            $('ul.switch-block.list-episode-item li').each((i, el) => {
                const title = $(el).find('h3.title').text().trim();
                const path = $(el).find('a').attr('href');
                const img = $(el).find('img').attr('data-original') || $(el).find('img').attr('src');
                const time = $(el).find('.time').text().trim();

                // path is usually /drama-name-episode-x.html
                // We need to extract drama ID or just pass path

                results.push({
                    title,
                    path,
                    poster: img,
                    time
                });
            });
            console.log(`Found ${results.length} items`);
            return results;
        } catch (e) {
            console.error(`Latest Error (${this.baseUrl}):`, e.message);
            return [];
        }
    }

    async getSearch(query) {
        try {
            const url = `${this.baseUrl}/search?keyword=${encodeURIComponent(query)}`;
            const { data } = await this.client.get(url);
            const $ = cheerio.load(data);

            const results = [];
            $('ul.list-episode-item li').each((i, el) => {
                const title = $(el).find('h3').text().trim();
                const path = $(el).find('a').attr('href');
                const img = $(el).find('img').attr('data-original') || $(el).find('img').attr('src');

                results.push({ title, path, poster: img });
            });
            return results;
        } catch (e) {
            console.error('Search Error:', e.message);
            return [];
        }
    }

    async getDetail(path) {
        // Warning: input path might be episode path or drama path. 
        // Dramacool usually links to episodes from home.
        // If it's episode path, we should find "Show Info" link.
        try {
            const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
            const { data } = await this.client.get(url);
            const $ = cheerio.load(data);

            // Check if this is an episode page or detail page
            const isEpisode = url.includes('-episode-');
            let info = {};

            if (isEpisode) {
                // If it's episode, find category/drama link
                const dramaLink = $('.category a').attr('href');
                if (dramaLink) {
                    // Recursive call to get actual detail
                    return this.getDetail(dramaLink);
                }
            }

            // Parse Detail Page
            const title = $('.info h1').text().trim();
            const poster = $('.info img').attr('src');
            const desc = $('.info .description').text().trim();

            // Episodes List
            const episodes = [];
            $('ul.list-episode-item-2 li a').each((i, el) => {
                const epTitle = $(el).find('.title').text().trim();
                const epPath = $(el).attr('href');
                const type = $(el).find('.type').text().trim();
                episodes.push({
                    title: epTitle,
                    path: epPath,
                    type
                });
            });

            return {
                title,
                poster,
                description: desc,
                episodes: episodes.reverse() // Usually listed desc
            };

        } catch (e) {
            console.error('Detail Error:', e.message);
            return null;
        }
    }

    async getStream(path) {
        try {
            const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
            const { data } = await this.client.get(url);
            const $ = cheerio.load(data);

            // Extract Iframe
            let iframeSrc = $('iframe').attr('src'); // Main player

            if (!iframeSrc) {
                // Fallback: search for other players/servers
                iframeSrc = $('.server-container .tab-content iframe').attr('src');
            }

            const link = iframeSrc && iframeSrc.startsWith('//') ? `https:${iframeSrc}` : iframeSrc;

            return {
                url: link,
                referer: this.baseUrl
            };
        } catch (e) {
            console.error('Stream Error:', e.message);
            return null;
        }
    }
}

module.exports = new DramacoolScraper();
