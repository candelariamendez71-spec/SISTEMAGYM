const { execSync } = require('child_process');
const path = require('path');

const projectDir = 'c:\\Users\\54265\\Downloads\\diseñov0sistemagym';

try {
  process.chdir(projectDir);
  console.log('📍 Working directory:', process.cwd());
  
  console.log('📝 Adding package.json...');
  execSync('git add package.json', { stdio: 'inherit' });
  
  console.log('📦 Committing changes...');
  execSync('git commit -m "fix: optimize sqlite3 postinstall - use prebuilt binaries"', { stdio: 'inherit' });
  
  console.log('🚀 Pushing to origin main...');
  execSync('git push origin main', { stdio: 'inherit' });
  
  console.log('✅ Push succeeded! Render will now re-deploy with the optimized postinstall.');
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
