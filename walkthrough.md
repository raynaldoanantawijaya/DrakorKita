# Drakorindo Network API Walkthrough

I have successfully reverse-engineered the private API used by `drakorindo18.mywap.blog` to load episode lists and stream data. The solution is now fully network-based, bypassing the need for Puppeteer or browser rendering.

## Discovered Internal Endpoints

The website uses a hidden API hosted at `api.drakorkita.cc` to fetch dynamic content.

### 1. Episode List API
- **Endpoint**: `GET https://api.drakorkita.cc/c_api/episode.php`
- **Parameters**:
  - `is_mob`: `0`
  - `is_uc`: `0`
  - `movie_id`: [Extracted from page source]
  - `tag`: [Extracted from page source]
  - `t`: [Current Unix Timestamp]
  - `ver`: `1.08`
- **Response**: JSON containing an HTML fragment (`episode_lists`) with the full list of episodes and server selection logic.

### 2. Server/Stream API
- **Endpoint**: `GET https://api.drakorkita.cc/c_api/server.php`
- **Trigger**: Called when `onclick` is triggered on an episode link.
- **Parameters**:
  - `episode_id`: [From episode list]
  - `server_xid`: [From episode list]
  - `tag`: [From page source]
  - ...others
- **Response**: JSON containing video metadata and either a P2P URL or embed code.

## Implementation Details

### Scraper Logic (`src/scraper.js`)
1. **Detail Page**: Fetches the raw HTML of the detail page (e.g., `/detail/taxi-driver-2025`).
2. **Variable Extraction**: Uses Regex to find the `loadEpisode('id', 'tag')` call embedded in the HTML.
3. **Direct API Call**: Constructs the URL for `episode.php` using the extracted tokens and fetches the JSON.
4. **Parsing**: Uses Cheerio to parse the `episode_lists` HTML fragment from the JSON response.
5. **Normalization**: Extracts the `onclick` arguments to build actionable API URLs for each episode.

### Endpoints (`src/routes.js`)
The following REST endpoints are now active at `http://localhost:3000/api/drakorindo/`:

- `GET /vip`: Returns trending/home content.
- `GET /latest`: Returns latest updates.
- `GET /all?page=1`: Returns all titles (supports pagination).
- `GET /series?page=1`: Returns series (supports pagination).
- `GET /movie?page=1`: Returns movies (supports pagination).
- `GET /detail/:id`: Returns full metadata + **Network-Scraped Episode List**.
  - **Episodes**: The `url` field is a tokenized link ready for resolution.
- `GET /stream?url=...`: **Full Stream Resolution**.
  - Returns a `sources` array containing **all available servers** (Hydrax, StreamSB, P2P) and **resolutions** (360p, 480p, 720p, 1080p).
- `GET /search?q=...&page=1`: Search functionality.

## Client Workflow for Streaming
1. Call `/detail/:id` to get the episode list.
2. Pick an episode.
3. Call `/stream?url={episode.url}`.
4. The API returns a list of **sources**.
   ```json
   "sources": [
     { "name": "HYDRAX 480p", "type": "hydrax", "resolution": "480", "resolve_url": "..." },
     { "name": "SB 720p", "type": "sb", "resolution": "720", "resolve_url": "..." }
   ]
   ```
5. Choose a source and use its `resolve_url` to get the final video player.

## Verification
Automated tests confirmed:
- **Pagination**: Successfully fetched Page 2 of "All" titles.
- **Detail Page**: Successfully extracts 16 episodes for "Taxi Driver 3".
- **Multi-Server**: Successfully extracted multiple server options (Hydrax, P2P) for a single episode.
- **Latest**: Verified extraction of the most recent uploads.

## How to Run
```bash
node src/index.js
```
Then test:
```bash
curl http://localhost:3000/api/drakorindo/detail/taxi-driver-2025-v1cy
```
