const bcrypt = require('bcryptjs');

const password = process.argv[2] || 'demo123';

bcrypt.hash(password, 12, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
});