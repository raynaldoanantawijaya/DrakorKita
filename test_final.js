// Native fetch (Node 18+)
const fs = require('fs');

const baseUrl = 'http://localhost:3000/api/drakorindo';

async function verify(name, url) {
    try {
        const start = Date.now();
        const res = await fetch(url);
        const duration = Date.now() - start;

        if (res.status === 200) {
            const json = await res.json();
            const count = json.data ? (Array.isArray(json.data) ? json.data.length : (json.data.sources ? json.data.sources.length : 1)) : 0;
            console.log(`[PASS] ${name.padEnd(20)} Status: 200 | Time: ${duration}ms | Items: ${count}`);
            return json.data;
        } else {
            console.log(`[FAIL] ${name.padEnd(20)} Status: ${res.status}`);
            return null;
        }
    } catch (e) {
        console.log(`[ERR ] ${name.padEnd(20)} ${e.message}`);
        return null;
    }
}

async function runFullTest() {
    console.log('=== DRAKORINDO API FINAL HEALTH CHECK ===\n');

    // 1. Listings
    await verify('Latest Updates', `${baseUrl}/latest`);
    await verify('All Movies', `${baseUrl}/movie?page=1`);
    await verify('All Series', `${baseUrl}/series?page=1`);

    // 2. Search
    const searchResults = await verify('Search "Vigilante"', `${baseUrl}/search?q=vigilante`);

    // 3. Detail & Stream Flow
    if (searchResults && searchResults.length > 0) {
        const targetId = searchResults[0].id; // Likely 'detail-vigilante-2023-4cqa' or similar
        const detailData = await verify('Detail Page', `${baseUrl}/detail/${targetId}`);

        if (detailData && detailData.episodes && detailData.episodes.length > 0) {
            const ep = detailData.episodes[0];
            console.log(`       > Selected Ep: ${ep.episode}`);

            const streamData = await verify('Stream sources', `${baseUrl}/stream?url=${encodeURIComponent(ep.url)}`);
            if (streamData && streamData.sources) {
                console.log('       > Sources discovered:');
                streamData.sources.forEach(s => console.log(`         - ${s.name} (${s.type})`));
            } else {
                console.log('       > No sources found in stream response.');
            }
        } else {
            console.log('       > No episodes found to test streaming.');
        }
    } else {
        console.log('       > Search failed, skipping Detail/Stream test.');
    }

    console.log('\n=== TEST COMPLETE ===');
}

runFullTest();
