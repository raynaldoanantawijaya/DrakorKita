const test = async (url) => {
    try {
        const res = await fetch(url);
        const json = await res.json();
        console.log(`\n=== TEST ${url} ===`);
        console.log('Status:', json.status);
        if (json.data && Array.isArray(json.data)) {
            console.log('Items:', json.data.length);
            if (json.data.length > 0) console.log('Sample:', json.data[0].title);
        }
        if (json.data && !Array.isArray(json.data)) {
            console.log('Title:', json.data.title);
            console.log('Episodes:', json.data.episodes ? json.data.episodes.length : 0);
            if (json.data.episodes && json.data.episodes.length > 0) {
                console.log('First Ep:', JSON.stringify(json.data.episodes[0], null, 2));
            }
        }
    } catch (e) { console.error('Error:', e.message); }
};

(async () => {
    await test('http://localhost:3000/api/drakorindo/latest');
    await test('http://localhost:3000/api/drakorindo/detail/taxi-driver-2025-v1cy');
    await test('http://localhost:3000/api/drakorindo/search?q=taxi');
})();
