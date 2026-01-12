// Check Cloudflare Worker Deployment
const workerUrl = 'https://film-213384jhk.anantawijaya212.workers.dev/api/drakorindo/latest';

async function checkWorker() {
    console.log(`Checking Worker: ${workerUrl} ...\n`);
    try {
        const start = Date.now();
        const res = await fetch(workerUrl);
        const time = Date.now() - start;

        console.log(`Status: ${res.status} (${time}ms)`);

        if (res.status === 200) {
            const json = await res.json();
            console.log(`Data Found: ${json.data ? json.data.length : 0} items`);
            if (json.data && json.data.length > 0) {
                console.log('Sample:', json.data[0].title);
            } else {
                console.log('Body Preview:', JSON.stringify(json).substring(0, 200));
            }
        } else {
            const text = await res.text();
            console.log('Error Body:', text.substring(0, 500));
        }

    } catch (e) {
        console.error('Check failed:', e.message);
    }
}

checkWorker();
