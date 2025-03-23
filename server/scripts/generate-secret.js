// server/scripts/generate-secret.js
const crypto = require('crypto');

// Generate a secure random string for use as SESSION_SECRET
const secret = crypto.randomBytes(64).toString('hex');

console.log('\n=== GENERATED SESSION SECRET ===');
console.log(secret);
console.log('\nAdd this to your .env file as:');
console.log(`SESSION_SECRET=${secret}\n`);
console.log('IMPORTANT: Keep this value secret and secure!');