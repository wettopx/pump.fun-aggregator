import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine if we're in a scripts folder or root
const isInScriptsFolder = __dirname.endsWith('scripts');
const projectRoot = isInScriptsFolder ? path.join(__dirname, '..') : __dirname;

console.log('🔄 Rebuilding user statistics from existing tokens...\n');

// Load existing tokens
let tokens = [];
const dataFolder = path.join(projectRoot, 'data');
const diskfunTokensPath = path.join(dataFolder, 'diskfun-tokens.json');
const oldTokensPath = path.join(projectRoot, 'tokens.json');

if (fs.existsSync(diskfunTokensPath)) {
    tokens = JSON.parse(fs.readFileSync(diskfunTokensPath, 'utf8'));
    console.log(`Loading from: data/diskfun-tokens.json`);
} else if (fs.existsSync(oldTokensPath)) {
    tokens = JSON.parse(fs.readFileSync(oldTokensPath, 'utf8'));
    console.log(`Loading from: tokens.json (old file)`);
} else {
    console.log('❌ No tokens file found!');
    console.log(`Checked: ${diskfunTokensPath}`);
    console.log(`Checked: ${oldTokensPath}`);
    process.exit(1);
}

console.log(`Found ${tokens.length} tokens\n`);

// Build user statistics
const userStats = {};

tokens.forEach(token => {
    const creator = token.creator;
    
    if (!creator) return;
    
    if (!userStats[creator]) {
        userStats[creator] = {
            totalTokens: 0,
            classicTokens: 0,
            infectedTokens: 0
        };
    }
    
    userStats[creator].totalTokens++;
    
    if (token.isInfected) {
        userStats[creator].infectedTokens++;
    } else {
        userStats[creator].classicTokens++;
    }
});

// Create data folder if it doesn't exist
if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
    console.log('Created data folder\n');
}

// Save user stats to data folder
const userStatsPath = path.join(dataFolder, 'user-stats.json');
fs.writeFileSync(userStatsPath, JSON.stringify(userStats, null, 2));

// Display summary
console.log('User Statistics Summary:');
console.log(`Total users: ${Object.keys(userStats).length}`);
console.log(`Total tokens: ${tokens.length}\n`);

// Show top 10 creators
const topCreators = Object.entries(userStats)
    .map(([wallet, stats]) => ({ wallet, ...stats }))
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .slice(0, 10);

console.log('Top 10 Token Creators:');
topCreators.forEach((creator, index) => {
    console.log(`${index + 1}. ${creator.wallet.slice(0, 4)}...${creator.wallet.slice(-4)}`);
    console.log(`   Total: ${creator.totalTokens} (Classic: ${creator.classicTokens}, Infected: ${creator.infectedTokens})`);
});

console.log('\n✅ User statistics rebuilt and saved to data/user-stats.json');