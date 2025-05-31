import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import multer from "multer";
import fs from "fs";
import { fileURLToPath } from "url";
import { buildMintTx } from "./server/launch.js";
import fetch from "node-fetch";

dotenv.config();
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Check if server minting is enabled
const SERVER_MINT_ENABLED = process.env.SERVER_MINT_ENABLED === 'true' && 
                           process.env.SERVER_MINT_PRIVATE_KEY;

console.log(`Server mint mode: ${SERVER_MINT_ENABLED ? 'ENABLED' : 'DISABLED'}`);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Serve the ic folder for infected token GIFs
app.use('/ic', express.static(path.join(__dirname, 'ic')));

// Store disk.fun tokens
let diskfunTokens = [];

// Store user statistics for leaderboard
let userStats = {};

// Store recently used infected names to prevent duplicates
let recentInfectedNames = [];
const MAX_RECENT_NAMES = 100; // Keep track of last 100 names

// Data directory configuration for Render
const dataDir = process.env.RENDER ? '/tmp/data' : path.join(__dirname, 'data');
const TOKENS_FILE = path.join(dataDir, 'diskfun-tokens.json');
const STATS_FILE = path.join(dataDir, 'user-stats.json');

// Create data folder if it doesn't exist
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data folder');
}

// Load saved tokens
if (fs.existsSync(TOKENS_FILE)) {
    try {
        diskfunTokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
        console.log(`Loaded ${diskfunTokens.length} disk.fun tokens`);
        
        // Build recent infected names list from existing tokens
        diskfunTokens.forEach(token => {
            if (token.isInfected && token.name) {
                recentInfectedNames.push(token.name);
            }
        });
        // Keep only the most recent names
        recentInfectedNames = recentInfectedNames.slice(-MAX_RECENT_NAMES);
        console.log(`Loaded ${recentInfectedNames.length} recent infected names`);
    } catch (e) {
        console.error('Error loading tokens:', e);
    }
}

// Load saved user stats or build from tokens
if (fs.existsSync(STATS_FILE)) {
    try {
        userStats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
        console.log(`Loaded stats for ${Object.keys(userStats).length} users`);
    } catch (e) {
        console.error('Error loading user stats:', e);
        userStats = {};
    }
} else {
    // Build stats from existing tokens if stats file doesn't exist
    console.log('Building user stats from existing tokens...');
    diskfunTokens.forEach(token => {
        if (token.creator) {
            if (!userStats[token.creator]) {
                userStats[token.creator] = {
                    totalTokens: 0,
                    classicTokens: 0,
                    infectedTokens: 0
                };
            }
            userStats[token.creator].totalTokens++;
            if (token.isInfected) {
                userStats[token.creator].infectedTokens++;
            } else {
                userStats[token.creator].classicTokens++;
            }
        }
    });
    if (Object.keys(userStats).length > 0) {
        saveUserStats();
        console.log(`Built stats for ${Object.keys(userStats).length} users`);
    }
}

// Save tokens
function saveTokens() {
    try {
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(diskfunTokens, null, 2));
    } catch (error) {
        console.error('Error saving tokens:', error);
    }
}

// Save user stats
function saveUserStats() {
    try {
        fs.writeFileSync(STATS_FILE, JSON.stringify(userStats, null, 2));
    } catch (error) {
        console.error('Error saving user stats:', error);
    }
}

// Upload setup - Using memory storage instead of disk
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images allowed'), false);
        }
    }
});

// Function to extract image URL from metadata
async function getImageFromMetadata(metadataUri) {
    if (!metadataUri) return null;
    
    try {
        // Convert IPFS URI to HTTP using pump.fun's gateway
        let url = metadataUri;
        if (metadataUri.startsWith('ipfs://')) {
            const hash = metadataUri.replace('ipfs://', '');
            url = `https://pump.mypinata.cloud/ipfs/${hash}`;
        } else if (metadataUri.match(/^(Qm[a-zA-Z0-9]{44}|baf[a-zA-Z0-9]+)$/)) {
            url = `https://pump.mypinata.cloud/ipfs/${metadataUri}`;
        }
        
        console.log(`Fetching metadata from: ${url}`);
        const response = await fetch(url);
        if (response.ok) {
            const metadata = await response.json();
            console.log(`Metadata image: ${metadata.image}`);
            return metadata.image || null;
        }
    } catch (e) {
        console.error('Error fetching metadata:', e);
    }
    
    return null;
}

// Function to select prefix based on weighted probability
function selectInfectedPrefix() {
    const rand = Math.random() * 100;
    
    // Rarity distribution:
    // Gero: 95%
    // Neo: 4%
    // Net: 0.9%
    // Bio: 0.1%
    
    if (rand < 95) return 'Gero';
    if (rand < 99) return 'Neo';
    if (rand < 99.9) return 'Net';
    return 'Bio';
}

// Hugging Face API for generating infected token names
const HUGGING_FACE_API = "https://api-inference.huggingface.co/models/google/flan-t5-base";

async function generateInfectedName(prefix) {
    let attempts = 0;
    const maxAttempts = 20;
    
    // Expanded suffix lists for more variety
    const techSuffixes = [
        'tech', 'core', 'sync', 'flux', 'mind', 'wave', 'link', 'node', 'mesh', 'grid',
        'nexus', 'prime', 'alpha', 'omega', 'cyber', 'nano', 'quantum', 'neural', 'virus', 'byte',
        'matrix', 'cipher', 'pulse', 'storm', 'void', 'spark', 'forge', 'realm', 'zone', 'shift',
        'force', 'drive', 'power', 'surge', 'blast', 'chain', 'lock', 'gate', 'wall', 'field',
        'infect', 'parasite', 'trojan', 'glitch', 'worm', 'corrupt', 'decay', 'venom', 'plague', 'strain',
        'outbreak', 'leak', 'breach', 'crash', 'payload', 'quarantine', 'exploit', 'rootkit', 'scramble', 'mutant',
        'drone', 'gridlock', 'overdrive', 'neon', 'shard', 'splice', 'chrome', 'deck', 'signal', 'override',
        'zero', 'trace', 'snare', 'drift', 'ghost', 'mirror', 'burner', 'vibe', 'inject', 'arc',
        'shade', 'rift', 'abyss', 'echo', 'silence', 'reaper', 'phantom', 'night', 'blackout', 'crypt',
        'null', 'oblivion', 'scar', 'shadow', 'hollow', 'fracture', 'grim', 'dread', 'omen', 'pulsevoid',
        'kernel', 'runtime', 'shell', 'protocol', 'data', 'beacon', 'array', 'net', 'uplink', 'stream',
        'scanner', 'daemon', 'compiler', 'socket', 'construct', 'loop', 'firewall', 'trigger', 'bitstream', 'daemoncore'
    ];
    
    while (attempts < maxAttempts) {
        try {
            const prompt = `Create a single creative futuristic word that starts with "${prefix}". The word should sound like a viral technology or biotech term. Examples: ${prefix}mega, ${prefix}tech, ${prefix}morph. Give only one word:`;
            
            const response = await fetch(HUGGING_FACE_API, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_length: 20,
                        temperature: 1.0 + (attempts * 0.1), // Increase temperature with each attempt
                        do_sample: true
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Hugging Face API error: ${response.status}`);
            }

            const result = await response.json();
            let generatedText = result[0]?.generated_text || "";
            
            // Clean up the response
            generatedText = generatedText.trim().split(' ')[0]; // Take first word only
            generatedText = generatedText.replace(/[^a-zA-Z]/g, ''); // Remove non-letters
            
            // If the AI didn't include the prefix, add it
            if (!generatedText.toLowerCase().startsWith(prefix.toLowerCase())) {
                // Use random suffix
                const randomSuffix = techSuffixes[Math.floor(Math.random() * techSuffixes.length)];
                generatedText = prefix + randomSuffix;
            }
            
            // Ensure proper capitalization
            generatedText = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase() + 
                           generatedText.slice(prefix.length);
            
            // Check if name already exists in recent names
            if (!recentInfectedNames.includes(generatedText)) {
                return generatedText;
            }
            
            attempts++;
            console.log(`Name ${generatedText} already exists, trying again (attempt ${attempts})`);
            
        } catch (error) {
            console.error('Error generating name with Hugging Face:', error);
            
            // Fallback to local generation with more variety
            attempts++;
            
            // Try to create unique combinations
            const randomSuffix1 = techSuffixes[Math.floor(Math.random() * techSuffixes.length)];
            const randomSuffix2 = techSuffixes[Math.floor(Math.random() * techSuffixes.length)];
            
            // Try different combinations
            const candidates = [
                prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase() + randomSuffix1,
                prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase() + randomSuffix1 + randomSuffix2.charAt(0).toUpperCase() + randomSuffix2.slice(1),
                prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase() + randomSuffix2
            ];
            
            for (const candidate of candidates) {
                if (!recentInfectedNames.includes(candidate)) {
                    return candidate;
                }
            }
        }
    }
    
    // Final fallback - combine multiple suffixes for uniqueness
    const suffix1 = techSuffixes[Math.floor(Math.random() * techSuffixes.length)];
    const suffix2 = techSuffixes[Math.floor(Math.random() * techSuffixes.length)];
    const suffix3 = techSuffixes[Math.floor(Math.random() * techSuffixes.length)];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase() + suffix1 + suffix2.charAt(0).toUpperCase() + suffix2.slice(1);
}

// Routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/create.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "create.html"));
});

app.get("/lb.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "lb.html"));
});

app.get("/game.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "game.html"));
});

app.get("/mp.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "mp.html"));
});

app.get("/docs.html", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "docs.html"));
});

app.get("/test-images.html", (req, res) => {
    res.sendFile(path.join(__dirname, "test-images.html"));
});

// API endpoint to generate infected token name
app.get("/api/generate-infected-name", async (req, res) => {
    try {
        // Use weighted selection for prefix
        const randomPrefix = selectInfectedPrefix();
        
        const fullName = await generateInfectedName(randomPrefix);
        const suffix = fullName.slice(randomPrefix.length);
        const symbol = suffix.toUpperCase(); // No length limit
        
        res.json({
            name: fullName,
            symbol: symbol,
            prefix: randomPrefix,
            suffix: suffix
        });
    } catch (error) {
        console.error('Error generating infected name:', error);
        res.status(500).json({ error: 'Failed to generate name' });
    }
});

// API endpoint to get disk.fun tokens only
app.get("/api/tokens", async (req, res) => {
    const tokensWithData = [];
    
    // Fetch updated data for each disk.fun token
    for (const token of diskfunTokens) {
        try {
            // Try pumpportal API first
            const response = await fetch(`https://pumpportal.fun/api/data/token/${token.mint}`, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Get image URL from various fields
                let imageUrl = data.image || data.image_uri || data.uri;
                
                // If no direct image, try to get from metadata
                if (!imageUrl && data.metadata_uri) {
                    imageUrl = await getImageFromMetadata(data.metadata_uri);
                }
                
                console.log(`Token ${token.name}: image=${imageUrl}`);
                
                tokensWithData.push({
                    mint: token.mint,
                    name: data.name || token.name,
                    symbol: data.symbol || token.symbol,
                    imageUrl: imageUrl,
                    price: data.price || 0.000001,
                    marketCap: data.market_cap || data.usd_market_cap || 0,
                    change24h: 0,
                    volume24h: data.volume || 0,
                    holders: data.holder_count || 1,
                    creator: token.creator,
                    createdAt: token.createdAt,
                    isInfected: token.isInfected
                });
            } else {
                // Try pump.fun API as fallback
                const pumpResponse = await fetch(`https://frontend-api.pump.fun/coins/${token.mint}`);
                
                if (pumpResponse.ok) {
                    const pumpData = await pumpResponse.json();
                    
                    // Debug log the response
                    console.log(`Pump.fun response for ${token.name}:`, {
                        image_uri: pumpData.image_uri,
                        uri: pumpData.uri,
                        metadata_uri: pumpData.metadata_uri,
                        metadataUri: pumpData.metadataUri
                    });
                    
                    // Try multiple fields for image URL
                    let imageUrl = pumpData.image_uri || 
                                   pumpData.uri ||
                                   pumpData.image || 
                                   pumpData.metadata?.image;
                    
                    // If we have a metadata URI but no image, try to fetch metadata
                    if (!imageUrl && (pumpData.metadata_uri || pumpData.metadataUri || pumpData.uri)) {
                        const metadataUri = pumpData.metadata_uri || pumpData.metadataUri || pumpData.uri;
                        imageUrl = await getImageFromMetadata(metadataUri);
                    }
                    
                    console.log(`Token ${token.name} final image: ${imageUrl}`);
                    
                    tokensWithData.push({
                        mint: token.mint,
                        name: pumpData.name || token.name,
                        symbol: pumpData.symbol || token.symbol,
                        imageUrl: imageUrl,
                        price: pumpData.price || 0.000001,
                        marketCap: pumpData.market_cap || pumpData.usd_market_cap || 0,
                        change24h: 0,
                        volume24h: pumpData.volume || 0,
                        holders: pumpData.holder_count || 1,
                        creator: token.creator,
                        createdAt: token.createdAt,
                        isInfected: token.isInfected
                    });
                } else {
                    // Use saved data if both APIs fail
                    console.log(`Both APIs failed for ${token.mint}`);
                    tokensWithData.push({
                        ...token,
                        price: 0.000001,
                        marketCap: 0,
                        change24h: 0,
                        volume24h: 0,
                        holders: 1
                    });
                }
            }
        } catch (error) {
            console.error(`Error fetching data for ${token.mint}:`, error);
            // Use saved data on error
            tokensWithData.push({
                ...token,
                price: 0.000001,
                marketCap: 0,
                change24h: 0,
                volume24h: 0,
                holders: 1
            });
        }
    }
    
    res.json(tokensWithData);
});

// API endpoint for leaderboard
app.get("/api/leaderboard", (req, res) => {
    try {
        // Convert userStats object to array and sort by total tokens
        const leaderboard = Object.entries(userStats)
            .map(([wallet, stats]) => ({
                wallet,
                totalTokens: stats.totalTokens || 0,
                classicTokens: stats.classicTokens || 0,
                infectedTokens: stats.infectedTokens || 0
            }))
            .sort((a, b) => b.totalTokens - a.totalTokens)
            .slice(0, 100); // Top 100 users
        
        console.log(`Returning leaderboard with ${leaderboard.length} users`);
        res.json(leaderboard);
    } catch (error) {
        console.error('Error in leaderboard endpoint:', error);
        res.status(500).json({ error: 'Failed to generate leaderboard' });
    }
});

// Classic launch endpoint
app.post("/launch-classic", upload.single("image"), async (req, res) => {
    try {
        const { name, symbol, userPublicKey, twitter, telegram, website, devBuyAmount, useServerMint } = req.body;
        
        if (!name || !symbol || !userPublicKey || !req.file) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        
        // Parse dev buy amount (always 0 now since feature is removed)
        const buyAmount = 0;
        
        // Check if server minting should be used
        const shouldUseServerMint = useServerMint === "true" && SERVER_MINT_ENABLED;
        
        console.log(`Launching CLASSIC ${name} (${symbol}) for ${userPublicKey}`);
        console.log(`Server mint: ${shouldUseServerMint ? 'YES' : 'NO'}`);
        
        // Prepare socials object
        const socials = {};
        if (twitter) socials.twitter = twitter;
        if (telegram) socials.telegram = telegram;
        if (website) socials.website = website;
        
        // Pass the buffer, socials, dev buy amount (0), and server mint flag
        const result = await buildMintTx(name, symbol, req.file.buffer, userPublicKey, 'classic', socials, 0, shouldUseServerMint);
        
        // Store disk.fun token
        const newToken = {
            mint: result.mint,
            name: name,
            symbol: symbol,
            isInfected: false,
            creator: userPublicKey,
            createdAt: new Date().toISOString(),
            imageUrl: null, // Will be updated when token is live
            socials: socials,
            serverMinted: result.serverMinted || false
        };
        
        diskfunTokens.unshift(newToken);
        saveTokens();
        
        // Update user stats
        if (!userStats[userPublicKey]) {
            userStats[userPublicKey] = {
                totalTokens: 0,
                classicTokens: 0,
                infectedTokens: 0
            };
        }
        userStats[userPublicKey].totalTokens++;
        userStats[userPublicKey].classicTokens++;
        saveUserStats();
        
        console.log(`Added disk.fun token: ${name} (${result.mint})`);
        console.log(`User ${userPublicKey} has created ${userStats[userPublicKey].totalTokens} tokens`);
        
        // No file cleanup needed - it's only in memory
        
        res.json(result);
    } catch (error) {
        console.error("Classic launch error:", error);
        res.status(400).json({ error: error.message });
    }
});

// Infected launch endpoint
app.post("/launch-infected", upload.single("image"), async (req, res) => {
    try {
        const { name, symbol, userPublicKey, randomInfected, useServerMint } = req.body;
        
        if (!name || !symbol || !userPublicKey) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        
        // Check if server minting should be used
        const shouldUseServerMint = useServerMint === "true" && SERVER_MINT_ENABLED;
        
        console.log(`Launching RANDOM INFECTED ${name} (${symbol}) for ${userPublicKey}`);
        console.log(`Server mint: ${shouldUseServerMint ? 'YES' : 'NO'}`);
        
        const result = await buildMintTx(name, symbol, null, userPublicKey, 'infected', {}, 0, shouldUseServerMint);
        
        // Add the name to recent infected names list
        recentInfectedNames.push(result.finalName || name);
        // Keep only the most recent names
        if (recentInfectedNames.length > MAX_RECENT_NAMES) {
            recentInfectedNames = recentInfectedNames.slice(-MAX_RECENT_NAMES);
        }
        
        // Store disk.fun token
        const newToken = {
            mint: result.mint,
            name: result.finalName || name,
            symbol: symbol,
            isInfected: true,
            creator: userPublicKey,
            createdAt: new Date().toISOString(),
            imageUrl: null, // Will be updated when token is live
            serverMinted: result.serverMinted || false
        };
        
        diskfunTokens.unshift(newToken);
        saveTokens();
        
        // Update user stats
        if (!userStats[userPublicKey]) {
            userStats[userPublicKey] = {
                totalTokens: 0,
                classicTokens: 0,
                infectedTokens: 0
            };
        }
        userStats[userPublicKey].totalTokens++;
        userStats[userPublicKey].infectedTokens++;
        saveUserStats();
        
        console.log(`Added disk.fun infected token: ${name} (${result.mint})`);
        console.log(`User ${userPublicKey} has created ${userStats[userPublicKey].totalTokens} tokens`);
        
        res.json(result);
    } catch (error) {
        console.error("Infected launch error:", error);
        res.status(400).json({ error: error.message });
    }
});

// Debug endpoint to check token data
app.get("/api/debug/:mint", async (req, res) => {
    try {
        console.log(`Debug: Fetching token ${req.params.mint}`);
        
        // Try pumpportal first
        const ppResponse = await fetch(`https://pumpportal.fun/api/data/token/${req.params.mint}`);
        let ppData = null;
        if (ppResponse.ok) {
            ppData = await ppResponse.json();
        }
        
        // Try pump.fun
        const pfResponse = await fetch(`https://frontend-api.pump.fun/coins/${req.params.mint}`);
        let pfData = null;
        if (pfResponse.ok) {
            pfData = await pfResponse.json();
        }
        
        // Extract image URL
        let imageUrl = ppData?.image || ppData?.image_uri || pfData?.image_uri || pfData?.image || pfData?.metadata?.image;
        
        // Try to get from metadata if needed
        if (!imageUrl && (pfData?.metadata_uri || pfData?.metadataUri)) {
            imageUrl = await getImageFromMetadata(pfData.metadata_uri || pfData.metadataUri);
        }
        
        res.json({
            mint: req.params.mint,
            pumpportal: ppData,
            pumpfun: pfData,
            detectedImageUrl: imageUrl,
            processedImageUrl: imageUrl ? processImageUrl(imageUrl) : null
        });
    } catch (error) {
        res.json({ error: error.message });
    }
});

// Helper function to process image URL (same logic as frontend)
function processImageUrl(url) {
    if (!url) return null;
    
    if (url.startsWith('ipfs://')) {
        const hash = url.replace('ipfs://', '');
        return `https://pump.mypinata.cloud/ipfs/${hash}?img-width=800&img-dpr=2&img-onerror=redirect`;
    }
    
    if (url.match(/^(Qm[a-zA-Z0-9]{44}|baf[a-zA-Z0-9]+)$/)) {
        return `https://pump.mypinata.cloud/ipfs/${url}?img-width=800&img-dpr=2&img-onerror=redirect`;
    }
    
    return url;
}

// Health check endpoint for Render
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", message: "disk.fun is running" });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Disk.fun running on http://localhost:${PORT}`);
    console.log(`📊 Tracking ${diskfunTokens.length} disk.fun tokens`);
    console.log(`👥 Tracking ${Object.keys(userStats).length} users`);
    console.log(`🦠 Infected GIFs served from: ${path.join(__dirname, 'ic')}`);
    console.log(`📝 Recent infected names: ${recentInfectedNames.length}`);
    console.log(`🌐 Environment: ${process.env.RENDER ? 'Render' : 'Local'}`);
});