#!/bin/bash
# Load environment variables
export $(grep -v '^#' .env | xargs)
export $(grep -v '^#' .env.local | xargs)

echo "📥 Exporting from Supabase..."

curl -s -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/users?select=*" > scripts/users.json
curl -s -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/families?select=*" > scripts/families.json
curl -s -H "apikey: $SUPABASE_SERVICE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/family_members?select=*" > scripts/family_members.json

echo "✅ Exported to scripts/*.json"
ls -lh scripts/*.json
