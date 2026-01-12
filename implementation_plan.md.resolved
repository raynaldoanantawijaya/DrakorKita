# Drakorindo Scraper API Implementation Plan

## Goal Description
Build a Node.js-based REST API that scrapes `drakorindo18.mywap.blog` to provide drama/movie data, including metadata, episode lists, and streaming URLs.

## User Review Required
> [!IMPORTANT]
> **Stream URL Extraction**: The website uses dynamic JS (`javascript:;`) to load stream URLs into an iframe.
> - **Primary Approach**: Attempt to extract the stream URL map from the page verification (regex on `<script>` tags). 
> - **Fallback**: Use Puppeteer to simulate clicks if static extraction fails (slower performance).
> - **Current Assumption**: We will use Puppeteer for the Detail Page if a static JSON map isn't found, as "Stream URL" logic seems complex (server selection).

> [!WARNING]
> **Performance**: Scraping on-the-fly (Real-time) might be slow.
> - **Optimization**: Implement `apicache` to cache responses for 1 hour (as requested "Cache results if possible").

## Proposed Changes

### Structure
- `src/index.js`: Express App entry point.
- `src/routes.js`: Route definitions.
- `src/scraper.js`: Scraper logic (Cheerio + Puppeteer).
- `src/utils.js`: Helper functions (Normalization).

### Dependencies
- `express`: API Framework.
- `puppeteer`: For dynamic content (Episode lists/Stream URLs).
- `cheerio`: For static content (Home, Search, Lists) to save resources.
- `cors`: Enable CORS.
- `apicache`: Caching.

### Endpoints (Draft)
1. `GET /vip` -> Scrape Home "Trending" section.
2. `GET /latest` -> Scrape Home "Latest Updates".
3. `GET /all` -> Scrape `/all` page.
4. `GET /series` -> Scrape `/all?media_type=tv`.
5. `GET /movie` -> Scrape `/all?media_type=movie`.
6. `GET /complete` -> Scrape `/all?status=ended`.
7. `GET /ongoing` -> Scrape `/all?status=returning%20series`.
8. `GET /genre/:genre` -> Scrape `/all?genre=:genre`.
9. `GET /detail/:id` -> Scrape `/detail/:id`. Uses Puppeteer to click through episodes if necessary.
10. `GET /search?q=:query` -> Scrape Search Results.

## Verification Plan

### Automated Tests
- Run `npm start`.
- Curl endpoints:
    - `curl http://localhost:3000/api/drakorindo/latest`
    - `curl http://localhost:3000/api/drakorindo/detail/taxi-driver-2025-v1cy` (Verify episode list is populated)
    - `curl http://localhost:3000/api/drakorindo/search?q=taxi`

### Manual Verification
- Check if `stream_url` is a valid `http` link (not `javascript:;`).
- Verify structure matches User Request JSON.
