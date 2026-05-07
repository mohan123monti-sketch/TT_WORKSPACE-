const db = require('./db');

async function seed() {
  // Intentionally left empty.
  // This project now runs without seed data.
  return { seeded: false };
}

seed().catch(console.error);
module.exports = seed;
