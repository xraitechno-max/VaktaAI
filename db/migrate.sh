#!/bin/bash

# Database Migration Script for StudySageAI
# Runs all SQL migrations in the migrations/ directory

set -e # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}StudySageAI Database Migration${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
    echo ""
    echo "Please set DATABASE_URL before running migrations:"
    echo "  export DATABASE_URL=\"postgresql://user:password@localhost:5432/studysage\""
    echo ""
    exit 1
fi

echo -e "${YELLOW}Database:${NC} $DATABASE_URL"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${RED}Error: Migrations directory not found at $MIGRATIONS_DIR${NC}"
    exit 1
fi

# Count migration files
MIGRATION_COUNT=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l)

if [ "$MIGRATION_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}No migration files found in $MIGRATIONS_DIR${NC}"
    exit 0
fi

echo -e "${GREEN}Found $MIGRATION_COUNT migration file(s)${NC}"
echo ""

# Run each migration in order
for migration in "$MIGRATIONS_DIR"/*.sql; do
    migration_name=$(basename "$migration")

    echo -e "${YELLOW}Running migration:${NC} $migration_name"

    # Run the migration
    if psql "$DATABASE_URL" -f "$migration" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Success${NC}"
    else
        echo -e "${RED}✗ Failed${NC}"
        echo ""
        echo "Migration failed. Running with verbose output:"
        psql "$DATABASE_URL" -f "$migration"
        exit 1
    fi

    echo ""
done

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All migrations completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Verify indexes were created
echo -e "${YELLOW}Verifying indexes...${NC}"
psql "$DATABASE_URL" -c "SELECT indexname FROM pg_indexes WHERE tablename = 'chunks' ORDER BY indexname;" -t

echo ""
echo -e "${GREEN}✓ Migration complete${NC}"
