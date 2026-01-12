const esbuild = require('esbuild');

esbuild.build({
    entryPoints: ['src/worker.js'],
    bundle: true,
    outfile: 'dist/_worker.js',
    format: 'esm',
    platform: 'browser', // Worker environment is more like browser than node
    target: 'esnext',
    // Make sure to externalize or alias node modules that Cloudflare supports
    // Or let esbuild know we will provide them?
    // Actually, for Pages Functions / Workers with node_compat, we should target neutral but handle imports.
    // The error showed "Could not resolve node:stream". 

    // Let's try leveraging the built-in node compat of Wrangler which uses unenv or similar.
    // But for raw esbuild, we need to be careful.

    // Strategy: Treat typical node builtins as external so esbuild doesn't verify them,
    // expecting the runtime (Cloudflare with node_compat) to provide them.
    external: ['node:stream', 'node:buffer', 'node:util', 'node:events', 'node:string_decoder'],
    alias: {
        'cheerio': 'cheerio' // ensure we use the installed one
    },
    define: {
        'process.env.NODE_ENV': '"production"'
    },
    loader: { '.html': 'text' },
    logLevel: 'info',
}).catch(() => process.exit(1));
