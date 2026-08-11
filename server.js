// m-spoofer Server — Credit: mt7s m-project
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const https = require('https');
const crypto = require('crypto');

const app = express();
const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

app.use((req, res, next) => {
    console.log(`\n[${new Date().toISOString()}] Incoming ${req.method} request to ${req.url}`);
    next();
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const API_KEY = process.env.OPEN_CLOUD_API_KEY;
const CREATOR_ID = process.env.ROBLOX_CREATOR_ID || "1";
const CREATOR_TYPE = process.env.ROBLOX_CREATOR_TYPE || "User";
const COOKIE = process.env.ROBLOSECURITY || "";
const DOWNLOAD_CONCURRENCY = parseInt(process.env.DOWNLOAD_CONCURRENCY, 10) || 50;
const UPLOAD_CONCURRENCY = parseInt(process.env.UPLOAD_CONCURRENCY, 10) || 15;

if (!API_KEY) {
    console.error("WARNING: OPEN_CLOUD_API_KEY is not set in .env!");
}

const jobs = new Map();

function cleanupJob(jobId) {
    setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
}

async function asyncPool(limit, items, iteratorFn) {
    const results = new Array(items.length);
    let cursor = 0;

    async function worker() {
        while (cursor < items.length) {
            const index = cursor++;
            results[index] = await iteratorFn(items[index], index);
        }
    }

    const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
    await Promise.all(workers);
    return results;
}

async function downloadAsset(assetId) {
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

            if (buffer.length < 500) {
                if (text.startsWith('{"errors":') || text.includes('User is not authorized') || text.includes('not authorized to access Asset')) {
                    throw new Error("Asset is private, moderated, or deleted (Not Authorized)");
                }
                if (text.startsWith('<Error><Code>AccessDenied</Code>')) {
                    throw new Error("Asset is private or deleted (S3 Access Denied)");
                }
            }

            if (text.includes('<roblox') && text.includes('<url>')) {
                const match = text.match(/id=(\d+)/) || text.match(/rbxassetid:\/\/(\d+)/);
                if (match && match[1]) {
                    console.log(`  [Redirect] Asset ${assetId} is an XML Decal. Redirecting to real image ID: ${match[1]}`);
                    return downloadAsset(match[1]);
                }
            }

            return buffer;
        } catch (error) {
            lastError = error;
            console.log(`  Download attempt failed for ${url}: ${error.message}`);
        }
    }

    throw lastError || new Error(`Failed to download asset ${assetId} from all endpoints.`);
}

async function pollOperation(operationPath) {
    const operationUrl = `https://apis.roblox.com/assets/v1/${operationPath}`;

    for (let attempts = 0; attempts < 30; attempts++) {
        await new Promise(r => setTimeout(r, 2000));

        try {
            const response = await axios.get(operationUrl, {
                headers: { 'x-api-key': API_KEY },
                httpsAgent: keepAliveAgent,
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
                console.error(`  Poll error:`, JSON.stringify(error.response.data));
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

    const uploadResponse = await axios.post(uploadUrl, formData, {
        headers: {
            'x-api-key': API_KEY,
            ...formData.getHeaders()
        },
        httpsAgent: keepAliveAgent,
    });

    const operationPath = uploadResponse.data.path;
    if (!operationPath) {
        if (uploadResponse.data.assetId) {
            return uploadResponse.data.assetId;
        }
        throw new Error(`No operation path in response: ${JSON.stringify(uploadResponse.data)}`);
    }

    console.log(`  Upload initiated. Polling... (${operationPath})`);
    return await pollOperation(operationPath);
}

const ASSET_CONFIG = {
    Animation: { filename: 'animation.rbxm', contentType: 'model/x-rbxm' },
    Mesh: { filename: 'mesh.mesh', contentType: 'model/x-file-mesh-data' },
    Audio: { filename: 'audio.ogg', contentType: 'audio/ogg' },
    Decal: { filename: 'image.png', contentType: 'image/png' },
    Image: { filename: 'image.png', contentType: 'image/png' },
};

async function processReplaceJob(job, ids, type, cType, cId) {
    console.log(`\n-- Downloading ${ids.length} asset(s), up to ${DOWNLOAD_CONCURRENCY} at a time --`);

    const downloads = await asyncPool(DOWNLOAD_CONCURRENCY, ids, async (oldId) => {
        try {
            let detectedType = type;
            let skip = false;
            let skipReason = "";
            try {
                const detailsRes = await axios.get(`https://economy.roblox.com/v2/assets/${oldId}/details`, {
                    headers: { 'User-Agent': 'Roblox/WinInet' },
                    validateStatus: () => true
                });
                if (detailsRes.status === 200 && detailsRes.data) {
                    if (detailsRes.data.AssetTypeId) {
                        const typeId = detailsRes.data.AssetTypeId;
                        if (typeId === 3) detectedType = "Audio";
                        else if (typeId === 4) detectedType = "Mesh";
                        else if (typeId === 24) detectedType = "Animation";
                        else if (typeId === 1 || typeId === 13) detectedType = "Image";
                    }
                    
                    if (detectedType !== type) {
                        return { oldId, ok: true, ignored: true, reason: `Asset is ${detectedType}, expected ${type}`, detectedType };
                    }
                    
                    const creator = detailsRes.data.Creator;
                    if (creator) {
                        if (creator.Id === 1 || creator.Name === 'Roblox') {
                            skip = true;
                            skipReason = 'Made by Roblox';
                        } else {
                            const effectiveId = cId || CREATOR_ID;
                            const effectiveType = cType || CREATOR_TYPE;
                            if (effectiveId && creator.CreatorTargetId && creator.CreatorTargetId.toString() === effectiveId.toString() && creator.CreatorType === effectiveType) {
                                skip = true;
                                skipReason = 'Already owned by target creator';
                            }
                        }
                    }
                }
            } catch (err) {
                // Ignore API check errors and fallback to requested type
            }

            if (skip) {
                console.log(`  [SKIPPED] ${oldId}: ${skipReason}`);
                return { oldId, ok: true, skipped: true, reason: skipReason, detectedType };
            }

            const buffer = await downloadAsset(oldId);
            console.log(`  [DL OK] ${oldId} (${buffer.length} bytes) [Auto-Detected: ${detectedType}]`);
            return { oldId, ok: true, buffer, detectedType };
        } catch (error) {
            console.log(`  [DL FAILED] ${oldId}: ${error.message}`);
            return { oldId, ok: false, error: error.message };
        }
    });

    const downloadById = new Map(downloads.map(d => [d.oldId, d]));

    const uploadType = (type === "Image") ? "Decal" : type;
    const config = ASSET_CONFIG[type] || ASSET_CONFIG.Animation;

    console.log(`\n-- Uploading ${ids.length} asset(s), up to ${UPLOAD_CONCURRENCY} at a time --`);
    let processedCount = 0;

    await asyncPool(UPLOAD_CONCURRENCY, ids, async (oldId) => {
        const dl = downloadById.get(oldId);

        if (!dl.ok) {
            job.results[oldId] = { status: 'Failed', error: dl.error };
        } else if (dl.ignored) {
            job.results[oldId] = { status: 'Ignored', reason: dl.reason };
            console.log(`  IGNORED: ${oldId} (${dl.reason})`);
        } else if (dl.skipped) {
            job.results[oldId] = { status: 'Success', newId: parseInt(oldId, 10) };
            console.log(`  SUCCESS (SKIPPED): ${oldId} -> ${oldId} (${dl.reason})`);
        } else {
            try {
                const newId = await uploadAssetOpenCloud(dl.buffer, oldId, uploadType, config.filename, config.contentType, cType, cId);
                console.log(`  SUCCESS: ${oldId} -> ${newId}`);
                job.results[oldId] = { status: 'Success', newId: parseInt(newId, 10) };
            } catch (error) {
                console.error(`  FAILED: ${oldId} - ${error.message}`);
                if (error.response && error.response.data) {
                    let errData = error.response.data;
                    if (errData instanceof Buffer || errData instanceof ArrayBuffer) {
                        errData = Buffer.from(errData).toString('utf8');
                    } else if (typeof errData === 'object') {
                        errData = JSON.stringify(errData);
                    } else {
                        errData = errData.toString();
                    }
                    console.error(`  Response: ${errData}`);
                }
                job.results[oldId] = { status: 'Failed', error: error.message };
            }
        }

        processedCount++;
        console.log(`  [Progress] ${processedCount}/${ids.length} finished.`);
    });

    job.done = true;
    cleanupJob(job.id);
}

app.get('/api/asset-type/:id', async (req, res) => {
    try {
        const assetId = req.params.id;
        let typeId = 0;

        const detailsRes = await axios.get(`https://economy.roblox.com/v2/assets/${assetId}/details`, {
            headers: { 'User-Agent': 'Roblox/WinInet' },
            validateStatus: () => true
        });
        
        if (detailsRes.status === 200 && detailsRes.data && detailsRes.data.AssetTypeId) {
            typeId = detailsRes.data.AssetTypeId;
        } else {
            try {
                const buffer = await downloadAsset(assetId);
                const str = buffer.toString('utf8', 0, 500);
                if (str.includes('<Item class="Animation"') || str.includes('<Item class="KeyframeSequence"')) {
                    typeId = 24;
                } else if (str.includes('<Item class="SpecialMesh"') || str.includes('version 1.00') || str.includes('version 2.00')) {
                    typeId = 4;
                } else if (buffer.length > 4 && buffer.slice(0, 4).toString('ascii') === 'OggS') {
                    typeId = 3;
                } else if (str.includes('PNG') || str.includes('JFIF') || str.includes('<Item class="Decal"')) {
                    typeId = 1;
                }
            } catch(e) {
                // Ignore download errors for type check
            }
        }
        res.json({ assetTypeId: typeId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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

    console.log(`\n========== ${type} Reupload Request (${ids.length} assets) ==========`);

    const job = { id: crypto.randomUUID(), results: {}, done: false, total: ids.length };
    jobs.set(job.id, job);

    res.json({ jobId: job.id, total: ids.length });

    processReplaceJob(job, ids, type, creatorType, creatorId).catch(error => {
        console.error(`Job ${job.id} crashed: ${error.message}`);
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
const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`m-spoofer Server running on http://127.0.0.1:${PORT}`);
    console.log(`Credit: mt7s m-project`);
    console.log(`Supported: Animation, Mesh, Audio, Image`);
    console.log(`Parallel downloads: ${DOWNLOAD_CONCURRENCY} at a time`);
    console.log(`Waiting for plugin requests...`);
});

server.on('error', (err) => {
    console.error('\n[ERROR] Server failed to start:', err.message);
    if (err.code === 'EADDRINUSE') {
        console.error(`=> Port ${PORT} is already in use by another program!`);
        console.error(`=> Please close any other running instances of the server before starting a new one.`);
    }
    process.exit(1);
});

// Prevent Node.js from exiting immediately
setInterval(() => { }, 1000 * 60 * 60);