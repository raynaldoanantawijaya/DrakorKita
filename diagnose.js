const express = require('express');
const router = express.Router();
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Proxy Config (UK Server)
const PROXY_URL = 'http://ikipfdis:z7x7yl9x6szs@198.105.121.200:6462';

router.get('/', async (req, res) => {
    const report = {
        steps: []
    };

    function log(step, status, detail = null) {
        report.steps.push({ step, status, detail });
    }

    try {
        // 1. Check Modules
        log('Import Modules', 'OK', {
            axios: typeof axios,
            proxyAgent: typeof HttpsProxyAgent
        });

        // 2. Check Internet (Direct)
        try {
            const google = await axios.get('https://www.google.com', { timeout: 5000 });
            log('Direct Internet', 'OK', `Status: ${google.status}`);
        } catch (e) {
            log('Direct Internet', 'FAIL', e.message);
        }

        // 3. Check Proxy Connection (Google)
        try {
            const agent = new HttpsProxyAgent(PROXY_URL);
            const googleProxy = await axios.get('https://ipv4.webshare.io/', {
                httpsAgent: agent,
                timeout: 10000
            });
            log('Proxy Connection (Webshare IP)', 'OK', {
                status: googleProxy.status,
                data: googleProxy.data.trim()
            });
        } catch (e) {
            log('Proxy Connection', 'FAIL', e.message);
            if (e.response) log('Proxy Error Resp', 'FAIL', e.response.status);
        }

        // 4. Check DrakorIndo Direct
        try {
            const drakor = await axios.get('https://drakorindo18.mywap.blog', { timeout: 5000 });
            log('Drakor Direct', 'OK', `Status: ${drakor.status} (Likely blocked/empty if OK)`);
        } catch (e) {
            log('Drakor Direct', 'FAIL', e.message);
        }

        // 5. Check DrakorIndo Proxy
        try {
            const agent = new HttpsProxyAgent(PROXY_URL);
            const drakorProxy = await axios.get('https://drakorindo18.mywap.blog', {
                httpsAgent: agent,
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                }
            });
            log('Drakor Proxy', 'OK', `Status: ${drakorProxy.status}, Length: ${drakorProxy.data.length}`);
        } catch (e) {
            log('Drakor Proxy', 'FAIL', e.message);
        }

        res.json(report);

    } catch (criticalError) {
        res.status(500).json({
            error: criticalError.message,
            stack: criticalError.stack,
            partialReport: report
        });
    }
});

module.exports = router;
