'use strict';

const bcrypt = require('bcryptjs');

async function main() {
  const plain = process.argv[2];
  if (!plain) {
    console.error('Użycie: npm run hash-password -- "TwojeHaslo"');
    process.exit(1);
  }
  if (plain.length < 8) {
    console.error('Hasło powinno mieć co najmniej 8 znaków.');
    process.exit(1);
  }
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
  const hash = await bcrypt.hash(plain, rounds);
  console.log('\nWklej tę linię do .env:\n');
  console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
