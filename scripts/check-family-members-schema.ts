#!/usr/bin/env tsx
import { Client } from 'pg';
import 'dotenv/config';

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();

  const result = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'family_members' AND table_schema = 'public'
    ORDER BY ordinal_position
  `);

  console.log('\n📋 family_members 表结构:\n');
  result.rows.forEach(row => {
    const nullable = row.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)';
    console.log(`  ${row.column_name.padEnd(25)} ${row.data_type.padEnd(30)} ${nullable}`);
  });

  await client.end();
}

main();
