#!/usr/bin/env tsx
import { Client } from 'pg';
import 'dotenv/config';

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();

  console.log('\n🔍 检查数据库中的现有数据...\n');

  // 检查 users
  const users = await client.query('SELECT id, email FROM users LIMIT 3');
  console.log('📊 users 表:');
  if (users.rows.length > 0) {
    users.rows.forEach(u => console.log(`  ✓ ${u.id} - ${u.email || '(no email)'}`));
  } else {
    console.log('  ⚠️  没有用户数据');
  }

  // 检查 families
  const families = await client.query('SELECT id, name, "creatorId" FROM families LIMIT 3');
  console.log('\n📊 families 表:');
  if (families.rows.length > 0) {
    families.rows.forEach(f => console.log(`  ✓ ${f.id} - ${f.name} (creator: ${f.creatorId})`));
  } else {
    console.log('  ⚠️  没有家庭数据');
  }

  // 检查 family_members
  const members = await client.query('SELECT id, "familyId", "userId", name FROM family_members LIMIT 5');
  console.log('\n📊 family_members 表:');
  if (members.rows.length > 0) {
    members.rows.forEach(m => console.log(`  ✓ ${m.id} - ${m.name} (family: ${m.familyId})`));
  } else {
    console.log('  ⚠️  没有家庭成员数据');
  }

  // 检查 recipes
  const recipes = await client.query('SELECT id, title, "familyId" FROM recipes LIMIT 3');
  console.log('\n📊 recipes 表:');
  if (recipes.rows.length > 0) {
    recipes.rows.forEach(r => console.log(`  ✓ ${r.id} - ${r.title}`));
  } else {
    console.log('  ⚠️  没有食谱数据');
  }

  await client.end();
}

main();
