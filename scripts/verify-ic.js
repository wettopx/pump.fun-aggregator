import fs from 'fs';
import path from 'path';

// Expected images configuration
const EXPECTED_IMAGES = {
    'Bio': 1,
    'Net': 3,
    'Neo': 4,
    'Gero': 6
};

console.log('Verifying IC folder setup...\n');

const icPath = path.join(process.cwd(), 'ic');

// Check if ic folder exists
if (!fs.existsSync(icPath)) {
    console.error('❌ ERROR: ic folder not found!');
    console.log('Please create an "ic" folder in the disk.fun directory');
    process.exit(1);
}

console.log('✅ ic folder found\n');

// Check for each prefix
let allGood = true;
for (const [prefix, count] of Object.entries(EXPECTED_IMAGES)) {
    console.log(`Checking ${prefix} images (expecting ${count}):`);
    
    const foundImages = [];
    for (let i = 1; i <= count; i++) {
        const imageName = `${prefix.toLowerCase()}${i}.gif`;
        const imagePath = path.join(icPath, imageName);
        
        if (fs.existsSync(imagePath)) {
            const stats = fs.statSync(imagePath);
            console.log(`  ✅ ${imageName} (${(stats.size / 1024).toFixed(2)} KB)`);
            foundImages.push(imageName);
        } else {
            console.log(`  ❌ ${imageName} - NOT FOUND`);
            allGood = false;
        }
    }
    console.log('');
}

// List any extra files
const allFiles = fs.readdirSync(icPath);
const expectedFiles = [];
for (const [prefix, count] of Object.entries(EXPECTED_IMAGES)) {
    for (let i = 1; i <= count; i++) {
        expectedFiles.push(`${prefix.toLowerCase()}${i}.gif`);
    }
}

const extraFiles = allFiles.filter(file => !expectedFiles.includes(file));
if (extraFiles.length > 0) {
    console.log('Extra files found in ic folder:');
    extraFiles.forEach(file => console.log(`  ⚠️  ${file}`));
    console.log('');
}

if (allGood) {
    console.log('✅ All expected images are present!');
    console.log('Total: 14 GIF images (1 Bio + 3 Net + 4 Neo + 6 Gero)');
} else {
    console.log('❌ Some images are missing! Please add the missing GIF files.');
}

// Show a summary
console.log('\n📊 Summary:');
console.log(`Total files in ic folder: ${allFiles.length}`);
console.log(`Expected GIF files: 14`);
console.log(`Missing files: ${14 - allFiles.filter(f => f.endsWith('.gif')).length}`);