#!/usr/bin/env tsx
import { Client } from 'pg';
import 'dotenv/config';

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();

  console.log('\n📋 recipe_favorites 表结构:\n');
  const favs = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'recipe_favorites' AND table_schema = 'public'
    ORDER BY ordinal_position
  `);
  favs.rows.forEach(row => console.log(`  ${row.column_name.padEnd(25)} ${row.data_type}`));

  console.log('\n📋 recipe_ratings 表结构:\n');
  const ratings = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'recipe_ratings' AND table_schema = 'public'
    ORDER BY ordinal_position
  `);
  ratings.rows.forEach(row => console.log(`  ${row.column_name.padEnd(25)} ${row.data_type}`));

  await client.end();
}

main();
