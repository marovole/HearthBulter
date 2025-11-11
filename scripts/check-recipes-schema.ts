#!/usr/bin/env tsx
import { Client } from 'pg';
import 'dotenv/config';

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();

  const result = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'recipes' AND table_schema = 'public'
    ORDER BY ordinal_position
  `);

  console.log('\n📋 recipes 表的列结构:\n');
  result.rows.forEach(row => {
    console.log(`  ${row.column_name.padEnd(25)} ${row.data_type}`);
  });
  console.log();

  await client.end();
}

main();
