const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.production');
if (!fs.existsSync(envPath)) {
  console.error('ERROR: .env.production not found at ' + envPath);
  process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf-8');
content.split('\n').forEach(line => {
  line = line.trim();
  if (!line || line.startsWith('#')) return;
  const eqIdx = line.indexOf('=');
  if (eqIdx === -1) return;
  const key = line.substring(0, eqIdx).trim();
  let val = line.substring(eqIdx + 1).trim();
  // Remove surrounding quotes if present
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.substring(1, val.length - 1);
  }
  process.env[key] = val;
});

console.log('Loaded environment from .env.production');
