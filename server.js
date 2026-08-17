// m-spoofer Server — Credit: mt7s m-project
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const https = require('https');
const crypto = require('crypto');

// ===================================================
// Terminal Colors
// ===================================================
const C = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[91m',
    redDim: '\x1b[31m',
    green: '\x1b[92m',
    greenDim: '\x1b[32m',
    blue: '\x1b[94m',
    cyan: '\x1b[96m',
    cyanDim: '\x1b[36m',
    magenta: '\x1b[95m',
    yellow: '\x1b[93m',
    orange: '\x1b[33m',
    white: '\x1b[97m',
    gray: '\x1b[90m',
    grayLight: '\x1b[37m',
};

// ===================================================
// 3D "M" Rotation Frames (ASCII-safe block art)
// Each frame is exactly 14 chars wide, 7 lines tall
// ===================================================
const M_FRAMES = [
    [ // Front
        ' ##       ## ',
        ' ###     ### ',
        ' ####   #### ',
        ' ## ## ## ## ',
        ' ##  ###  ## ',
        ' ##   #   ## ',
        ' ##       ## ',
    ],
    [ // Turn 1
        '  ##     ##  ',
        '  ###   ###  ',
        '  #### ####  ',
        '  ## ### ##  ',
        '  ##  #  ##  ',
        '  ##     ##  ',
        '  ##     ##  ',
    ],
    [ // Turn 2
        '   ##   ##   ',
        '   ### ###   ',
        '   #######   ',
        '   ## # ##   ',
        '   ##   ##   ',
        '   ##   ##   ',
        '   ##   ##   ',
    ],
    [ // Turn 3
        '    ## ##    ',
        '    #####    ',
        '    #####    ',
        '    ## ##    ',
        '    ## ##    ',
        '    ## ##    ',
        '    ## ##    ',
    ],
    [ // Edge
        '     ###     ',
        '     ###     ',
        '     ###     ',
        '     ###     ',
        '     ###     ',
        '     ###     ',
        '     ###     ',
    ],
    [ // Turn 3 mirror
        '    ## ##    ',
        '    #####    ',
        '    #####    ',
        '    ## ##    ',
        '    ## ##    ',
        '    ## ##    ',
        '    ## ##    ',
    ],
    [ // Turn 2 mirror
        '   ##   ##   ',
        '   ### ###   ',
        '   #######   ',
        '   ## # ##   ',
        '   ##   ##   ',
        '   ##   ##   ',
        '   ##   ##   ',
    ],
    [ // Turn 1 mirror
        '  ##     ##  ',
        '  ###   ###  ',
        '  #### ####  ',
        '  ## ### ##  ',
        '  ##  #  ##  ',
        '  ##     ##  ',
        '  ##     ##  ',
    ],
];

const PALETTES = [
    [C.blue, C.blue, C.cyan, C.cyan, C.white, C.cyan, C.blue],
    [C.cyan, C.cyan, C.white, C.white, C.cyan, C.white, C.cyan],
    [C.magenta, C.magenta, C.cyan, C.cyan, C.blue, C.cyan, C.magenta],
];

const LINES_PER_FRAME = 12;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function playMAnimation() {
    const total = M_FRAMES.length;

    process.stdout.write('\x1b[?25l'); // hide cursor
    for (let i = 0; i < LINES_PER_FRAME; i++) process.stdout.write('\n');

    for (let rot = 0; rot < 3; rot++) {
        const pal = PALETTES[rot % PALETTES.length];
        for (let f = 0; f < total; f++) {
            process.stdout.write(`\x1b[${LINES_PER_FRAME}A`);
            process.stdout.write('\n\n');
            const frame = M_FRAMES[f];
            for (let r = 0; r < frame.length; r++) {
                process.stdout.write(`        ${pal[r]}${C.bold}${frame[r]}${C.reset}\x1b[K\n`);
            }
            const dots = '.'.repeat((rot * total + f) % 4);
            process.stdout.write(`\n        ${C.gray}Loading${dots.padEnd(4)}${C.reset}\x1b[K\n`);
            process.stdout.write('\x1b[K\n');
            await sleep(70);
        }
    }

    process.stdout.write('\x1b[?25h'); // show cursor

    // Final splash
    process.stdout.write(`\x1b[${LINES_PER_FRAME}A`);
    process.stdout.write('\n\n');
    const pal = PALETTES[0];
    for (let r = 0; r < M_FRAMES[0].length; r++) {
        process.stdout.write(`        ${pal[r]}${C.bold}${M_FRAMES[0][r]}${C.reset}\x1b[K\n`);
    }
    process.stdout.write('\x1b[K\n');

    // Branding box
    const W = 42;
    const line = '-'.repeat(W);
    console.log(`  ${C.cyan}${C.bold}+${line}+${C.reset}`);
    console.log(`  ${C.cyan}|${C.reset}  ${C.white}${C.bold}m-spoofer${C.reset} ${C.grayLight}Server${C.reset} ${C.cyan}v1.0${C.reset}                  ${C.cyan}|${C.reset}`);
    console.log(`  ${C.cyan}|${C.reset}  ${C.gray}Credit: mt7s m-project${C.reset}                  ${C.cyan}|${C.reset}`);
    console.log(`  ${C.cyan}${C.bold}+${line}+${C.reset}`);
    console.log('\x1b[K');
}

// ===================================================
// Logging Helpers
// ===================================================

function logSuccess(msg) {
    console.log(`  ${C.green}${C.bold} + ${C.reset}${C.green}${msg}${C.reset}`);
}

function logError(msg) {
    console.log(`  ${C.red}${C.bold} - ${C.reset}${C.red}${msg}${C.reset}`);
}

function logErrorDetail(msg) {
    console.log(`  ${C.redDim}     > ${C.dim}${msg}${C.reset}`);
}

function logInfo(msg) {
    console.log(`  ${C.cyan}${C.bold} i ${C.reset}${C.white}${msg}${C.reset}`);
}

function logWarn(msg) {
    console.log(`  ${C.yellow}${C.bold} ! ${C.reset}${C.yellow}${msg}${C.reset}`);
}

function logDim(msg) {
    console.log(`  ${C.gray}   ${msg}${C.reset}`);
}

function logProgress(current, total, successCount, failedCount) {
    const W = 30;
    const pct = total > 0 ? current / total : 0;
    const filled = Math.round(W * pct);
    const empty = W - filled;
    const bar = `${C.green}${'='.repeat(filled)}${C.gray}${'.'.repeat(empty)}${C.reset}`;
    const pctStr = `${Math.round(pct * 100)}%`.padStart(4);
    process.stdout.write(`\r  ${C.gray}   [${C.reset}${bar}${C.gray}]${C.reset} ${C.white}${C.bold}${pctStr}${C.reset} ${C.gray}|${C.reset} ${C.green}${successCount} ok${C.reset} ${C.red}${failedCount} fail${C.reset} ${C.gray}(${current}/${total})${C.reset}   `);
}

function categorizeError(errorMessage) {
    const msg = (errorMessage || '').toLowerCase();
    if (msg.includes('not authorized') || msg.includes('unauthorized') || msg.includes('forbidden')) {
        return { icon: 'LOCKED', reason: 'No Permission', color: C.orange };
    }
    if (msg.includes('copylocked') || msg.includes('inaccessible')) {
        return { icon: 'LOCKED', reason: 'Copylocked', color: C.orange };
    }
    if (msg.includes('not found') || msg.includes('was not found')) {
        return { icon: '404', reason: 'Not Found', color: C.yellow };
    }
    if (msg.includes('archived')) {
        return { icon: 'ARCH', reason: 'Archived', color: C.grayLight };
    }
    if (msg.includes('invalid') || msg.includes('content is invalid')) {
        return { icon: 'BAD', reason: 'Invalid Content', color: C.yellow };
    }
    if (msg.includes('timeout') || msg.includes('timed out')) {
        return { icon: 'TIME', reason: 'Timeout', color: C.orange };
    }
    if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many')) {
        return { icon: 'RATE', reason: 'Rate Limited', color: C.red };
    }
    if (msg.includes('cloudflare')) {
        return { icon: 'CF', reason: 'Cloudflare Block', color: C.orange };
    }
    if (msg.includes('socket hang up') || msg.includes('econnreset') || msg.includes('econnaborted')) {
        return { icon: 'NET', reason: 'Connection Lost', color: C.orange };
    }
    return { icon: 'ERR', reason: 'Error', color: C.red };
}

const app = express();
const keepAliveAgent = new https.Agent({ 
    keepAlive: true, 
    maxSockets: 200, 
    maxFreeSockets: 50, 
    timeout: 60000 
});

app.use((req, res, next) => {
    logDim(`[${new Date().toISOString()}] ${req.method} -> ${req.url}`);
    next();
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const API_KEY = process.env.OPEN_CLOUD_API_KEY;
const CREATOR_ID = process.env.ROBLOX_CREATOR_ID || "1";
const CREATOR_TYPE = process.env.ROBLOX_CREATOR_TYPE || "User";
const COOKIE = process.env.ROBLOSECURITY || "";
const DOWNLOAD_CONCURRENCY = parseInt(process.env.DOWNLOAD_CONCURRENCY, 10) || 15;

class Semaphore {
    constructor(max) {
        this.max = max;
        this.current = 0;
        this.queue = [];
    }
    async acquire() {
        if (this.current < this.max) {
            this.current++;
            return;
        }
        return new Promise(resolve => this.queue.push(resolve));
    }
    release() {
        this.current--;
        if (this.queue.length > 0) {
            this.current++;
            const resolve = this.queue.shift();
            resolve();
        }
    }
}
const globalSemaphore = new Semaphore(DOWNLOAD_CONCURRENCY);

if (!API_KEY) {
    console.error("WARNING: OPEN_CLOUD_API_KEY is not set in .env!");
}

const jobs = new Map();

function cleanupJob(jobId) {
    setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
}



async function withExponentialBackoff(operationName, maxRetries, baseDelayMs, fn) {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            return await fn(attempt);
        } catch (error) {
            const isRateLimit = error.response && error.response.status === 429;
            const isNetworkError = !error.response || error.code === 'ECONNABORTED' || error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.message.includes('timeout') || error.message.includes('socket hang up');
            
            if ((isRateLimit || isNetworkError) && attempt < maxRetries - 1) {
                attempt++;
                const delay = (baseDelayMs * Math.pow(1.5, attempt - 1)) + (Math.random() * 1000);
                logWarn(`${operationName} retry ${attempt}/${maxRetries - 1} — ${error.message} (waiting ${Math.round(delay)}ms)`);
                await new Promise(r => setTimeout(r, delay));
            } else {
                throw error;
            }
        }
    }
}

async function downloadAsset(assetId, depth = 0) {
    const baseHeaders = {
        'User-Agent': 'Roblox/WinInet',
        'Accept': 'application/octet-stream',
        'Referer': 'https://www.roblox.com/',
    };
    if (COOKIE) {
        baseHeaders['Cookie'] = `.ROBLOSECURITY=${COOKIE}`;
    }

    const endpoints = [
        `https://assetdelivery.roblox.com/v1/asset?id=${assetId}`,
        `https://assetdelivery.roblox.com/v1/assetId/${assetId}`,
    ];

    return await withExponentialBackoff(`Download ${assetId}`, 3, 1500, async () => {
        let lastError = null;
        for (const url of endpoints) {
            try {
                if (url.includes('/v1/assetId/')) {
                    const metaResponse = await axios.get(url, {
                        headers: baseHeaders,
                        maxRedirects: 0,
                        validateStatus: (status) => status >= 200 && status < 400,
                        httpsAgent: keepAliveAgent,
                        timeout: 15000,
                    });
                    const location = metaResponse.data?.location;
                    if (location) {
                        const dataResponse = await axios.get(location, {
                            responseType: 'arraybuffer',
                            headers: baseHeaders,
                            httpsAgent: keepAliveAgent,
                            timeout: 15000,
                        });
                        return dataResponse.data;
                    }
                }

                const response = await axios.get(url, {
                    responseType: 'arraybuffer',
                    headers: baseHeaders,
                    maxRedirects: 10,
                    httpsAgent: keepAliveAgent,
                    timeout: 15000,
                });
                
                const buffer = response.data;
                const text = buffer.toString('utf8');
                
                if (text.trim().startsWith('{') && text.includes('"errors"')) {
                    let errorMsg = "Asset is copylocked or inaccessible";
                    try {
                        const parsed = JSON.parse(text);
                        if (parsed.errors && parsed.errors[0] && parsed.errors[0].message) {
                            errorMsg = parsed.errors[0].message;
                        }
                    } catch(e) {}
                    const err = new Error(`Download failed: ${errorMsg}`);
                    err.isAuthError = true;
                    throw err;
                }
                
                if (text.includes('<roblox') && text.includes('<url>')) {
                    const match = text.match(/id=(\d+)/) || text.match(/rbxassetid:\/\/(\d+)/);
                    if (match && match[1]) {
                        console.log(`  ${C.gray}  ↳ Redirect: Asset ${assetId} → image #${match[1]}${C.reset}`);
                        if (depth > 5) throw new Error('Too many redirects');
                        return downloadAsset(match[1], depth + 1);
                    }
                }
                
                return buffer;
            } catch (error) {
                if (error.isAuthError || error.response?.status === 401 || error.response?.status === 403 || error.response?.status === 404) {
                    throw error; 
                }
                lastError = error;
            }
        }
        throw lastError || new Error(`Failed to download asset ${assetId} from all endpoints.`);
    });
}

async function pollOperation(operationPath) {
    const operationUrl = `https://apis.roblox.com/assets/v1/${operationPath}`;

    for (let attempts = 0; attempts < 30; attempts++) {
        await new Promise(r => setTimeout(r, 2000));

        try {
            const response = await withExponentialBackoff(`Poll ${operationPath}`, 3, 2000, async () => {
                return await axios.get(operationUrl, {
                    headers: { 'x-api-key': API_KEY },
                    httpsAgent: keepAliveAgent,
                    timeout: 20000,
                });
            });

            const data = response.data;
            if (data.done) {
                if (data.response && data.response.assetId) {
                    return data.response.assetId;
                } else {
                    throw new Error(`Operation completed but no Asset ID found. Response: ${JSON.stringify(data)}`);
                }
            }
            console.log(`  ... polling ${operationPath} (in progress)`);
        } catch (error) {
            if (error.response) {
                logErrorDetail(`Poll error: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
        }
    }

    throw new Error(`Operation timed out after 60 seconds.`);
}

function buildCreatorObj(cType, cId) {
    const creatorObj = {};
    const effectiveType = cType || CREATOR_TYPE;
    const effectiveId = cId || CREATOR_ID;
    if (effectiveType === "Group") {
        creatorObj.groupId = effectiveId;
    } else {
        creatorObj.userId = effectiveId;
    }
    return creatorObj;
}

async function uploadAssetOpenCloud(buffer, oldId, assetType, filename, contentType, cType, cId) {
    const uploadUrl = 'https://apis.roblox.com/assets/v1/assets';
    const formData = new FormData();
    const creatorObj = buildCreatorObj(cType, cId);

    const requestJson = {
        assetType,
        creationContext: { creator: creatorObj },
        displayName: `${oldId}`,
        description: ""
    };

    formData.append('request', JSON.stringify(requestJson));
    formData.append('fileContent', buffer, { filename, contentType });

    const uploadResponse = await withExponentialBackoff(`Upload ${oldId}`, 5, 3000, async () => {
        return await axios.post(uploadUrl, formData, {
            headers: {
                'x-api-key': API_KEY,
                ...formData.getHeaders()
            },
            httpsAgent: keepAliveAgent,
            timeout: 60000,
        });
    });

    const operationPath = uploadResponse.data.path;
    if (!operationPath) {
        if (uploadResponse.data.assetId) {
            return uploadResponse.data.assetId;
        }
        throw new Error(`No operation path in response: ${JSON.stringify(uploadResponse.data)}`);
    }

    logDim(`Upload initiated. Polling... (${operationPath})`);
    return await pollOperation(operationPath);
}

const ASSET_CONFIG = {
    Animation: { filename: 'animation.rbxm', contentType: 'model/x-rbxm' },
    Mesh:      { filename: 'mesh.mesh',       contentType: 'model/x-file-mesh-data' },
    Audio:     { filename: 'audio.ogg',        contentType: 'audio/ogg' },
    Decal:     { filename: 'image.png',        contentType: 'image/png' },
    Image:     { filename: 'image.png',        contentType: 'image/png' },
};



async function processReplaceJob(job, ids, type, cType, cId) {
    console.log('');
    console.log(`  ${C.cyan}${C.bold}+----------------------------------------------+${C.reset}`);
    console.log(`  ${C.cyan}|${C.reset} ${C.white}${C.bold}${type}${C.reset}${C.white} Reupload | ${C.bold}${ids.length}${C.reset}${C.white} assets | Workers: ${C.bold}${DOWNLOAD_CONCURRENCY}${C.reset}       ${C.cyan}|${C.reset}`);
    console.log(`  ${C.cyan}${C.bold}+----------------------------------------------+${C.reset}`);
    console.log('');

    const uploadType = (type === "Image") ? "Decal" : type;
    const config = ASSET_CONFIG[type] || ASSET_CONFIG.Animation;
    let successCount = 0;
    let failedCount = 0;
    let processed = 0;
    const startTime = Date.now();
    const errorSummary = {};

    await Promise.all(ids.map(async (oldId) => {
        await globalSemaphore.acquire();
        try {
            const buffer = await downloadAsset(oldId);

            const textPreview = buffer.toString('utf8', 0, Math.min(buffer.length, 5000));
            if (textPreview.includes('cf-chl-gen') || textPreview.includes('Cloudflare') || textPreview.includes('cf-browser-verification')) {
                throw new Error('Blocked by Cloudflare challenge.');
            }

            try {
                const newId = await uploadAssetOpenCloud(buffer, oldId, uploadType, config.filename, config.contentType, cType, cId);
                successCount++;
                processed++;
                logSuccess(`${oldId} -> ${C.bold}${newId}${C.reset}`);
                logProgress(processed, ids.length, successCount, failedCount);
                job.results[oldId] = { status: 'Success', newId: parseInt(newId, 10) };
            } catch (error) {
                failedCount++;
                processed++;
                const cat = categorizeError(error.message);
                errorSummary[cat.reason] = (errorSummary[cat.reason] || 0) + 1;
                logError(`${oldId} -- ${cat.icon} ${cat.reason}`);
                logErrorDetail(error.message);
                logProgress(processed, ids.length, successCount, failedCount);
                job.results[oldId] = { status: 'Failed', error: error.message };
            }
        } catch (error) {
            failedCount++;
            processed++;
            const cat = categorizeError(error.message);
            errorSummary[cat.reason] = (errorSummary[cat.reason] || 0) + 1;
            logError(`${oldId} -- ${cat.icon} ${cat.reason}`);
            logErrorDetail(error.message);
            logProgress(processed, ids.length, successCount, failedCount);
            job.results[oldId] = { status: 'Failed', error: error.message };
        } finally {
            globalSemaphore.release();
        }
    }));

    // Clear progress bar line
    process.stdout.write('\r' + ' '.repeat(80) + '\r');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('');
    console.log(`  ${C.cyan}${C.bold}+----------------------------------------------+${C.reset}`);
    console.log(`  ${C.cyan}|${C.reset} ${C.white}${C.bold}Job Complete${C.reset}${C.white} -- ${elapsed}s elapsed${C.reset}                   ${C.cyan}|${C.reset}`);
    console.log(`  ${C.cyan}+----------------------------------------------+${C.reset}`);
    logSuccess(`Success: ${successCount}`);
    if (failedCount > 0) {
        logError(`Failed:  ${failedCount}`);
    }

    // Error breakdown
    if (Object.keys(errorSummary).length > 0) {
        console.log('');
        console.log(`  ${C.red}${C.bold}  Error Breakdown:${C.reset}`);
        for (const [reason, count] of Object.entries(errorSummary).sort((a, b) => b[1] - a[1])) {
            const cat = categorizeError(reason);
            console.log(`  ${C.gray}    [${cat.icon}] ${C.reset}${cat.color}${reason}${C.reset}${C.gray}: ${C.white}${C.bold}${count}${C.reset}`);
        }
    }
    console.log(`  ${C.gray}${'-'.repeat(48)}${C.reset}`);
    console.log('');

    job.done = true;
    cleanupJob(job.id);
}

app.post('/api/replace', (req, res) => {
    const { ids, assetType, creatorType, creatorId } = req.body;
    const type = assetType || "Animation";

    if (!ASSET_CONFIG[type]) {
        return res.status(400).json({ error: 'Unsupported asset type. Use Animation, Mesh, Audio, or Image.' });
    }

    if (!API_KEY) {
        return res.status(500).json({ error: 'Server is missing OPEN_CLOUD_API_KEY configuration.' });
    }

    if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: 'Invalid ids array' });
    }

    console.log('');
    console.log(`  ${C.cyan}${C.bold}========== ${type} Reupload Request (${ids.length} assets) ==========${C.reset}`);

    const job = { id: crypto.randomUUID(), results: {}, done: false, total: ids.length };
    jobs.set(job.id, job);

    res.json({ jobId: job.id, total: ids.length });

    processReplaceJob(job, ids, type, creatorType, creatorId)
        .catch(error => {
            logError(`Job ${job.id} crashed: ${error.message}`);
            logErrorDetail(error.stack ? error.stack.split('\n')[1] : '');
            job.done = true;
            cleanupJob(job.id);
        });
});

app.get('/api/replace/status/:jobId', (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) {
        return res.status(404).json({ error: 'Unknown or expired job id' });
    }
    res.json({ done: job.done, total: job.total, results: job.results });
});

const PORT = 3000;

async function startServer() {
    await playMAnimation();

    const server = app.listen(PORT, '127.0.0.1', () => {
        logSuccess(`Server running on ${C.bold}http://127.0.0.1:${PORT}${C.reset}`);
        console.log('');
        logInfo(`Supported: ${C.bold}Animation${C.reset}${C.white}, ${C.bold}Mesh${C.reset}${C.white}, ${C.bold}Audio${C.reset}${C.white}, ${C.bold}Image${C.reset}`);
        logInfo(`Concurrency: ${C.bold}${DOWNLOAD_CONCURRENCY}${C.reset}${C.white} parallel operations`);
        if (!COOKIE) logWarn('ROBLOSECURITY cookie not set -- some assets may fail to download');
        console.log('');
        console.log(`  ${C.green}${C.bold}  [*] ${C.reset}${C.green}Ready -- Waiting for plugin requests...${C.reset}`);
        console.log(`  ${C.gray}${'-'.repeat(48)}${C.reset}`);
        console.log('');
    });

    server.on('error', (err) => {
        console.log('');
        logError(`Server failed to start: ${err.message}`);
        if (err.code === 'EADDRINUSE') {
            logError(`Port ${PORT} is already in use!`);
            logWarn(`Close other running instances first.`);
        }
        process.exit(1);
    });
}

startServer();

setInterval(() => {}, 1000 * 60 * 60);