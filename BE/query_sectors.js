const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  
  const res = await client.query("SELECT ma, ten, cap FROM business_sectors WHERE cap = 1");
  console.log('business_sectors cap = 1 rows:', res.rows);

  await client.end();
}

run().catch(console.error);
