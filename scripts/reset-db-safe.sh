#!/usr/bin/env bash
# Bezpečný lokální reset databáze pro development.
# Načte DATABASE_URL z .env, udělá timestamped backup a resetuje DB + seed.
# Nesmí se commitovat žádné secrets.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Načti .env (pokud existuje)
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_ROOT/.env"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL není nastaven. Zkontroluj .env"
  exit 1
fi

# Parsuj connection string
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:/]*\)[:/].*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_PORT="${DB_PORT:-5432}"
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:@]*\)[^@]*@.*|\1|p')

echo "→ Databáze: $DB_NAME na $DB_HOST:$DB_PORT (user: $DB_USER)"

# Ověř dostupnost PostgreSQL
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -q; then
  echo "❌ PostgreSQL není dostupný na $DB_HOST:$DB_PORT"
  exit 1
fi
echo "✓ PostgreSQL běží"

# Backup, pokud DB existuje
DB_EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT 1" 2>/dev/null || echo "")
if [[ "$DB_EXISTS" == "1" ]]; then
  BACKUP_FILE="/tmp/backup_${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql"
  echo "→ Záloha do: $BACKUP_FILE"
  pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
  echo "✓ Backup hotový: $BACKUP_FILE"
else
  echo "→ Databáze neexistuje nebo je prázdná — přeskakuji backup"
fi

# Prisma migrate reset --force
echo "→ Spouštím prisma migrate reset --force"
cd "$PROJECT_ROOT"
npx prisma migrate reset --force
echo "✓ Migrate reset hotový"

# Prisma generate (pro jistotu)
echo "→ Generuji Prisma Client"
npx prisma generate
echo "✓ Prisma Client vygenerován"

# Seed (migrate reset ho spustí automaticky přes prisma config,
# ale seed.ts není v prisma.seed, tak ho spouštíme ručně)
echo "→ Spouštím seed"
npm run seed
echo "✓ Seed hotový"

echo ""
echo "✅ DB reset dokončen. Spusť: npm run dev"
