/* eslint-disable */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  try {
    const sql = fs.readFileSync(path.join(__dirname, '011_add_history_to_atvsld_reports.sql'), 'utf8');
    await c.query(sql);
    console.log('✓ added column history to atvsld_reports');
  } finally {
    await c.end();
  }
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
