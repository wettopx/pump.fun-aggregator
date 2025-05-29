import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine if we're in a scripts folder or root
const isInScriptsFolder = __dirname.endsWith('scripts');
const projectRoot = isInScriptsFolder ? path.join(__dirname, '..') : __dirname;

console.log('\n🔍 Viewing all tokens...\n');

// Try to load tokens from data folder first
const dataFolder = path.join(projectRoot, 'data');
const diskfunTokensPath = path.join(dataFolder, 'diskfun-tokens.json');
const oldTokensPath = path.join(projectRoot, 'tokens.json');

let tokens = [];
let tokensFile = '';

if (fs.existsSync(diskfunTokensPath)) {
    tokens = JSON.parse(fs.readFileSync(diskfunTokensPath, 'utf8'));
    tokensFile = 'data/diskfun-tokens.json';
} else if (fs.existsSync(oldTokensPath)) {
    tokens = JSON.parse(fs.readFileSync(oldTokensPath, 'utf8'));
    tokensFile = 'tokens.json (old file)';
    console.log('⚠️  Found old tokens.json file. Consider migrating to data/diskfun-tokens.json\n');
} else {
    console.log('❌ No tokens file found!');
    process.exit(1);
}

console.log(`Loading from: ${tokensFile}`);
console.log(`Total tokens: ${tokens.length}\n`);

// Display tokens
tokens.forEach((token, index) => {
    console.log(`${index + 1}. ${token.name} (${token.symbol})`);
    console.log(`   Mint: ${token.mint}`);
    console.log(`   Type: ${token.isInfected ? '🦠 INFECTED' : '✨ CLASSIC'}`);
    console.log(`   Creator: ${token.creator ? token.creator.slice(0, 6) + '...' + token.creator.slice(-4) : 'Unknown'}`);
    console.log(`   Created: ${token.createdAt || 'Unknown'}`);
    console.log('');
});

// Show summary
const classicCount = tokens.filter(t => !t.isInfected).length;
const infectedCount = tokens.filter(t => t.isInfected).length;

console.log('Summary:');
console.log(`Total tokens: ${tokens.length}`);
console.log(`Classic tokens: ${classicCount}`);
console.log(`Infected tokens: ${infectedCount}`);