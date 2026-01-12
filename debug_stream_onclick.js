// Native fetch
const cheerio = require('cheerio');

async function debugStream() {
    try {
        // 1. Get Vigilante Detail to find an episode URL
        console.log('Fetching Vigilante details...');
        const detailRes = await fetch('http://localhost:3000/api/drakorindo/detail/vigilante-2023-4cqa');
        const detailJson = await detailRes.json();

        if (!detailJson.data || detailJson.data.episodes.length === 0) {
            console.error('No episodes found');
            return;
        }

        const ep1 = detailJson.data.episodes[0];
        console.log('Target URL:', ep1.url);

        const sRes = await fetch(ep1.url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const sJson = await sRes.json();

        if (sJson.server_lists) {
            const $ = cheerio.load(sJson.server_lists);
            console.log('\n--- Links Inspection ---');
            $('a').each((i, el) => {
                const onclick = $(el).attr('onclick');
                if (onclick) {
                    console.log(`Link ${i}: ${onclick}`);
                    // Test regex
                    const args = onclick.match(/'([^']+)'/g);
                    console.log(`   Regex matches: ${args ? args.length : 0}`);
                    if (args) console.log(`   Args: ${args.join(', ')}`);
                }
            });
        }

    } catch (e) { console.error(e); }
}

debugStream();
