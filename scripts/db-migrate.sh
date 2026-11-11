#!/usr/bin/env bash
# Applies supabase/migrations/*.sql to the hosted database, in order, recording each one
# in supabase_migrations.schema_migrations so nothing is applied twice.
#   SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres npm run db:migrate
set -euo pipefail
: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL (Supabase → Connect → Session pooler connection string)}"
npx supabase db push --db-url "$SUPABASE_DB_URL" --dry-run
read -r -p "Apply the migrations listed above? [y/N] " answer
[[ "$answer" == "y" || "$answer" == "Y" ]] || { echo "Aborted."; exit 1; }
npx supabase db push --db-url "$SUPABASE_DB_URL"
