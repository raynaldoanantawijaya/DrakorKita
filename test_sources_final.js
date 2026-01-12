// Native fetch
const fs = require('fs');

async function checkStreamSources() {
    try {
        console.log('1. Getting Detail for Taxi Driver (Reliable Test Case)...');
        const detailRes = await fetch('http://localhost:3000/api/drakorindo/detail/taxi-driver-2025-v1cy');
        const detailJson = await detailRes.json();

        if (!detailJson.data || detailJson.data.episodes.length === 0) {
            console.error('No episodes found');
            return;
        }

        const url = detailJson.data.episodes[0].url;
        console.log('2. Checking Stream URL:', url);

        const streamRes = await fetch(`http://localhost:3000/api/drakorindo/stream?url=${encodeURIComponent(url)}`);
        const streamJson = await streamRes.json();

        console.log('3. Stream Response Status:', streamJson.status);
        if (streamJson.data && streamJson.data.sources) {
            console.log(`   Sources Found: ${streamJson.data.sources.length}`);
            console.log('   Sample Source:', JSON.stringify(streamJson.data.sources[0], null, 2));
        } else {
            console.log('   No sources field found in response.');
        }

    } catch (e) { console.error(e); }
}

checkStreamSources();
