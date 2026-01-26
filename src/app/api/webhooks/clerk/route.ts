import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { clerkClient } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

function normalizeBase64(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  if (pad === 0) return normalized;
  return normalized + "=".repeat(4 - pad);
}

function base64ToBytes(base64: string): Uint8Array {
  const normalized = normalizeBase64(base64);
  const bin = atob(normalized);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) {
    return bytes.buffer as ArrayBuffer;
  }
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    bin += String.fromCharCode(...chunk);
  }
  return btoa(bin);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function getSvixV1Candidates(headerValue: string): string[] {
  const parts: string[] = [];
  for (const token of headerValue.split(/\s+/).filter(Boolean)) {
    for (const piece of token.split(",").filter(Boolean)) {
      parts.push(piece.trim());
    }
  }

  return parts
    .map((p) => {
      if (p.startsWith("v1,")) return p.slice("v1,".length);
      if (p.startsWith("v1=")) return p.slice("v1=".length);
      return null;
    })
    .filter((v): v is string => typeof v === "string" && v.length > 0);
}

async function verifySvixWebhook(
  payload: string,
  headerList: Headers,
  secret: string
): Promise<unknown> {
  const svixId = headerList.get("svix-id");
  const svixTimestamp = headerList.get("svix-timestamp");
  const svixSignature = headerList.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error("missing_svix_headers");
  }

  const timestamp = Number(svixTimestamp);
  if (!Number.isFinite(timestamp)) {
    throw new Error("invalid_svix_timestamp");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const toleranceSeconds = 5 * 60;
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    throw new Error("svix_timestamp_out_of_tolerance");
  }

  const secretValue = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  const keyBytes = base64ToBytes(secretValue);

  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(keyBytes),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
  const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedContent));
  const expected = bytesToBase64(new Uint8Array(sigBuffer));

  const candidates = getSvixV1Candidates(svixSignature);

  const matched = candidates.some((cand) => constantTimeEqual(cand, expected));
  if (!matched) {
    throw new Error("svix_signature_mismatch");
  }

  return JSON.parse(payload) as unknown;
}

export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "CLERK_WEBHOOK_SECRET 未设置" }, { status: 500 });
  }

  const payload = await request.text();
  const headerList = headers();

  let event: unknown;
  try {
    event = await verifySvixWebhook(payload, headerList, webhookSecret);
  } catch (e) {
    const message = e instanceof Error ? e.message : "verify_failed";
    if (message === "missing_svix_headers") {
      return NextResponse.json({ error: "缺少签名头" }, { status: 400 });
    }
    if (message === "svix_timestamp_out_of_tolerance" || message === "invalid_svix_timestamp") {
      return NextResponse.json({ error: "签名时间戳无效" }, { status: 400 });
    }
    return NextResponse.json({ error: "签名验证失败" }, { status: 400 });
  }

  if (!event || typeof event !== "object") {
    return NextResponse.json({ ok: true });
  }

  const typedEvent = event as { type?: unknown; data?: unknown };
  const eventType = typeof typedEvent.type === "string" ? typedEvent.type : null;

  if (eventType === "user.created" || eventType === "user.updated") {
    const data = typedEvent.data as {
      id?: string;
      email_addresses?: Array<{ email_address: string }>;
      primary_email_address_id?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      image_url?: string | null;
    };

    const clerkId = typeof data?.id === "string" ? data.id : null;
    if (!clerkId) {
      return NextResponse.json({ ok: true });
    }

    const emailFromEvent =
      data.email_addresses?.find((e) => e.email_address && e.email_address.length > 0)
        ?.email_address ?? null;

    let email = emailFromEvent;
    if (!email) {
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(clerkId);
        const primaryId = user.primaryEmailAddressId;
        email =
          (primaryId
            ? user.emailAddresses.find(
                (e: { id: string; emailAddress: string }) => e.id === primaryId
              )?.emailAddress
            : user.emailAddresses[0]?.emailAddress) ?? null;
      } catch {
        // ignore: best-effort email backfill
      }
    }

    if (!email) return NextResponse.json({ ok: true });

    const name = [data.first_name, data.last_name].filter(Boolean).join(" ");

    const { getConvexClient, api } = await import("@/lib/convex-client");
    const convex = getConvexClient();
    await convex.mutation(api.users.upsertFromClerk, {
      clerkId,
      email,
      name: name || undefined,
      image: data.image_url ?? undefined,
    });
  }

  return NextResponse.json({ ok: true });
}
