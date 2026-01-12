const responseSuccess = (data) => {
    return {
        status: true,
        source: "drakorindo18",
        data: data
    };
};

const responseError = (message) => {
    return {
        status: false,
        source: "drakorindo18",
        message: message
    };
};

const normalizeSlug = (text) => {
    // Extract ID from URL if it's a URL
    if (text.includes('/detail/')) {
        const parts = text.split('/detail/');
        return parts[1].replace(/\/$/, '');
    }
    // Remove special chars and spaces
    // Handle "Taxi Driver (2025)" -> "taxi-driver"
    let clean = text.toLowerCase();
    clean = clean.replace(/\(\d{4}\).*/, ''); // Remove year
    clean = clean.replace(/[^a-z0-9]+/g, '-');
    return clean.replace(/(^-|-$)+/g, '');
};

const extractIdFromUrl = (url) => {
    if (!url) return null;
    const match = url.match(/\/detail\/([^\/]+)\/?/);
    return match ? match[1] : null;
};

const parseViews = (text) => {
    if (!text) return 0;
    // Remove non-numeric characters except for k/m
    const n = text.toLowerCase().replace(/,/g, '').trim();
    if (n.includes('k')) return parseFloat(n) * 1000;
    if (n.includes('m')) return parseFloat(n) * 1000000;
    return parseInt(n.replace(/[^0-9]/g, '')) || 0;
};

module.exports = {
    responseSuccess,
    responseError,
    normalizeSlug,
    extractIdFromUrl,
    parseViews
};
