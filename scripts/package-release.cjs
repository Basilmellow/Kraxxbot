const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const indexFile = path.join(distDir, 'index.js');

if (!fs.existsSync(indexFile)) {
  console.error('❌ Error: dist/index.js does not exist. Run `npm run build` first.');
  process.exit(1);
}

const artifactDir = path.join('C:', 'Users', 'basil', '.gemini', 'antigravity-ide', 'brain', '59a3f31d-24f8-4085-8b86-994294a8a1db');
const outputZip = path.join(artifactDir, 'kraxxbot-production-release.zip');
const localZip = path.join(rootDir, 'kraxxbot-production-release.zip');

console.log('📦 Packaging KraxxBot production release artifact...');

// Create temporary staging directory
const stagingDir = path.join(rootDir, 'dist-release-staging');
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

// Helper to copy recursive
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Copy required files
console.log('• Copying dist/ ...');
copyRecursiveSync(path.join(rootDir, 'dist'), path.join(stagingDir, 'dist'));

console.log('• Copying prisma/ ...');
copyRecursiveSync(path.join(rootDir, 'prisma'), path.join(stagingDir, 'prisma'));

console.log('• Copying package.json & lockfile & DEPLOYMENT.md ...');
fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(stagingDir, 'package.json'));
fs.copyFileSync(path.join(rootDir, 'package-lock.json'), path.join(stagingDir, 'package-lock.json'));
fs.copyFileSync(path.join(rootDir, 'DEPLOYMENT.md'), path.join(stagingDir, 'DEPLOYMENT.md'));

// Zip using PowerShell Compress-Archive
console.log('• Creating zip archive...');
const psCommand = `Compress-Archive -Path "${path.join(stagingDir, '*')}" -DestinationPath "${localZip}" -Force`;
execSync(`powershell -Command "${psCommand}"`, { stdio: 'inherit' });

// Copy to artifactDir as well
if (fs.existsSync(artifactDir)) {
  fs.copyFileSync(localZip, outputZip);
  console.log(`✅ Production release artifact saved to artifact directory:\n  ${outputZip}`);
}
console.log(`✅ Production release artifact created at:\n  ${localZip}`);

// Cleanup staging
fs.rmSync(stagingDir, { recursive: true, force: true });
