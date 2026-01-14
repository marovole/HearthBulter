import { createClient } from "@supabase/supabase-js";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fetch from "node-fetch";
// @ts-ignore
global.fetch = fetch;

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

console.log(`Convex URL: ${convexUrl}`);
const supabase = createClient(supabaseUrl, supabaseKey);
const convex = new ConvexHttpClient(convexUrl, { fetch: fetch as any });

async function migrate() {
  console.log("🚀 Starting migration from Supabase to Convex...");

  // ID Mapping: Supabase ID -> Convex ID
  const userIdMap = new Map<string, any>();
  const familyIdMap = new Map<string, any>();

  // 1. Migrate Users
  console.log("👥 Migrating Users...");
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("*");

  if (userError) throw userError;

  for (const user of users) {
    try {
      const convexId = await convex.mutation(api.migrations.insertUser, {
        email: user.email,
        name: user.name || undefined,
        image: user.image || undefined,
        passwordHash: user.password || undefined,
        role: user.role === "ADMIN" ? "ADMIN" : "USER",
        createdAt: new Date(user.createdAt).getTime(),
        updatedAt: new Date(user.updatedAt).getTime(),
      });
      userIdMap.set(user.id, convexId);
      console.log(`✅ User ${user.email} migrated.`);
    } catch (e) {
      console.error(`❌ Failed to migrate user ${user.email}:`, e);
    }
  }

  // 2. Migrate Families
  console.log("🏠 Migrating Families...");
  const { data: families, error: familyError } = await supabase
    .from("families")
    .select("*");

  if (familyError) throw familyError;

  for (const family of families) {
    const creatorId = userIdMap.get(family.creatorId);
    if (!creatorId) {
      console.warn(
        `⚠️ Skipping family ${family.name}: Creator ${family.creatorId} not found.`,
      );
      continue;
    }

    try {
      const convexId = await convex.mutation(api.migrations.insertFamily, {
        name: family.name,
        description: family.description || undefined,
        inviteCode: family.inviteCode || undefined,
        creatorId: creatorId,
        createdAt: new Date(family.createdAt).getTime(),
        updatedAt: new Date(family.updatedAt).getTime(),
      });
      familyIdMap.set(family.id, convexId);
      console.log(`✅ Family ${family.name} migrated.`);
    } catch (e) {
      console.error(`❌ Failed to migrate family ${family.name}:`, e);
    }
  }

  // 3. Migrate Family Members
  console.log("👨‍👩‍👧‍👦 Migrating Family Members...");
  const { data: members, error: memberError } = await supabase
    .from("family_members")
    .select("*");

  if (memberError) throw memberError;

  for (const member of members) {
    const familyId = familyIdMap.get(member.familyId);
    const userId = member.userId ? userIdMap.get(member.userId) : undefined;

    if (!familyId) {
      console.warn(
        `⚠️ Skipping member ${member.name}: Family ${member.familyId} not found.`,
      );
      continue;
    }

    try {
      await convex.mutation(api.migrations.insertFamilyMember, {
        name: member.name,
        gender: member.gender || "OTHER",
        birthDate: new Date(member.birthDate).getTime(),
        height: member.height || undefined,
        weight: member.weight || undefined,
        familyId: familyId,
        userId: userId,
        role:
          member.role === "ADMIN"
            ? "ADMIN"
            : member.role === "GUEST"
              ? "GUEST"
              : "MEMBER",
        createdAt: new Date(member.createdAt).getTime(),
        updatedAt: new Date(member.updatedAt).getTime(),
      });
      console.log(`✅ Member ${member.name} migrated.`);
    } catch (e) {
      console.error(`❌ Failed to migrate member ${member.name}:`, e);
    }
  }

  console.log("🎉 Migration completed!");
}

migrate().catch(console.error);
