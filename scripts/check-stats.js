import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine if we're in a scripts folder or root
const isInScriptsFolder = __dirname.endsWith('scripts');
const projectRoot = isInScriptsFolder ? path.join(__dirname, '..') : __dirname;

console.log('\n📊 Checking user statistics...\n');

// Check if stats file exists
const dataFolder = path.join(projectRoot, 'data');
const statsPath = path.join(dataFolder, 'user-stats.json');

if (!fs.existsSync(statsPath)) {
    console.log('❌ No user-stats.json file found!');
    console.log('Stats will be created automatically when you restart the server.\n');
    process.exit(0);
}

// Load stats
const userStats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
const totalUsers = Object.keys(userStats).length;

if (totalUsers === 0) {
    console.log('No users have created tokens yet.\n');
    process.exit(0);
}

console.log(`Total users: ${totalUsers}\n`);

// Show all users sorted by tokens
const sortedUsers = Object.entries(userStats)
    .map(([wallet, stats]) => ({ wallet, ...stats }))
    .sort((a, b) => b.totalTokens - a.totalTokens);

sortedUsers.forEach((user, index) => {
    console.log(`${index + 1}. ${user.wallet}`);
    console.log(`   Total: ${user.totalTokens} (Classic: ${user.classicTokens}, Infected: ${user.infectedTokens})\n`);
});

// Check tokens file
const tokensPath = path.join(dataFolder, 'diskfun-tokens.json');
if (fs.existsSync(tokensPath)) {
    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    console.log(`\nTotal tokens in system: ${tokens.length}`);
}