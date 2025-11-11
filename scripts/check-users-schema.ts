#!/usr/bin/env tsx
import { Client } from 'pg';
import 'dotenv/config';

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();

  console.log('\n📋 users 表结构:\n');
  const result = await client.query(`
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_name = 'users' AND table_schema = 'public'
    ORDER BY ordinal_position
  `);

  result.rows.forEach(row => {
    const nullable = row.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)';
    const hasDefault = row.column_default ? `[default: ${row.column_default}]` : '';
    console.log(`  ${row.column_name.padEnd(25)} ${row.data_type.padEnd(20)} ${nullable} ${hasDefault}`);
  });

  await client.end();
}

main();
