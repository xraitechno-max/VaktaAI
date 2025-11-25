# Database Migrations

## Overview

This directory contains SQL migration files for optimizing the StudySageAI database.

## Migrations

### 001_create_vector_index.sql

**Purpose:** Create optimized indexes for enhanced DocChat performance

**Indexes Created:**

1. **HNSW Vector Index** (`chunks_embedding_hnsw_idx`)
   - Type: HNSW (Hierarchical Navigable Small World)
   - Purpose: Fast approximate nearest neighbor search for RAG
   - Performance: 5-20x speedup over sequential scan
   - Parameters:
     - `m=16`: Max connections per layer
     - `ef_construction=64`: Build-time accuracy

2. **GIN Full-Text Index** (`chunks_text_gin_idx`)
   - Type: GIN (Generalized Inverted Index)
   - Purpose: Fast keyword/phrase search
   - Performance: 10-100x speedup for text search
   - Supports: PostgreSQL full-text search with `to_tsvector`

3. **GIN Trigram Index** (`chunks_text_trgm_idx`)
   - Type: GIN with trigram operators
   - Purpose: Fuzzy text matching and similarity search
   - Supports: LIKE queries, similarity searches

4. **B-tree Document Index** (`chunks_doc_id_idx`)
   - Type: B-tree
   - Purpose: Fast filtering by document ID
   - Use case: "Search in this specific document"

5. **Composite B-tree Index** (`chunks_doc_id_page_idx`)
   - Type: B-tree on (doc_id, page)
   - Purpose: Fast page-specific lookups
   - Partial index: Only for rows with non-null pages

## Running Migrations

### Option 1: Using psql (Recommended)

```bash
# Set your database connection string
export DATABASE_URL="postgresql://user:password@localhost:5432/studysage"

# Run the migration
psql $DATABASE_URL -f db/migrations/001_create_vector_index.sql
```

### Option 2: Using npm script

Add this to `package.json`:

```json
{
  "scripts": {
    "migrate": "psql $DATABASE_URL -f db/migrations/001_create_vector_index.sql"
  }
}
```

Then run:

```bash
npm run migrate
```

### Option 3: Manual execution

1. Connect to your database:
   ```bash
   psql -h localhost -U your_user -d studysage
   ```

2. Run the migration:
   ```sql
   \i db/migrations/001_create_vector_index.sql
   ```

## Verifying Indexes

After running the migration, verify indexes were created:

```sql
-- List all indexes on chunks table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'chunks';

-- Check index sizes
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public' AND relname = 'chunks'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Verify HNSW index parameters
SELECT indexname,
       (SELECT option_name || '=' || option_value
        FROM pg_options_to_table(reloptions)) as options
FROM pg_indexes
WHERE indexname = 'chunks_embedding_hnsw_idx';
```

## Performance Tuning

### HNSW Query-Time Parameters

For vector similarity search, adjust `ef_search` based on accuracy vs speed tradeoff:

```sql
-- Higher accuracy, slower queries (default: 40)
SET hnsw.ef_search = 100;

-- Balanced (recommended)
SET hnsw.ef_search = 40;

-- Faster, lower accuracy
SET hnsw.ef_search = 20;
```

Set this in your application code before running vector similarity queries.

### Full-Text Search Optimization

For better text search relevance, use custom text search configurations:

```sql
-- Create custom text search config for educational content
CREATE TEXT SEARCH CONFIGURATION edu_english (COPY = english);

-- Use in queries
SELECT * FROM chunks
WHERE to_tsvector('edu_english', text) @@ to_tsquery('edu_english', 'physics & energy');
```

## Monitoring Index Usage

Track index usage to ensure they're being used:

```sql
-- Check if indexes are being scanned
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'chunks'
ORDER BY idx_scan DESC;

-- If idx_scan is 0, the index is not being used
-- If idx_scan is high, the index is working well
```

## Rollback

If you need to remove these indexes:

```sql
-- Remove all indexes (NOT recommended in production)
DROP INDEX IF EXISTS chunks_embedding_hnsw_idx;
DROP INDEX IF EXISTS chunks_text_gin_idx;
DROP INDEX IF EXISTS chunks_text_trgm_idx;
DROP INDEX IF EXISTS chunks_doc_id_idx;
DROP INDEX IF EXISTS chunks_doc_id_page_idx;

-- Revert to old IVFFlat index (if needed)
CREATE INDEX chunks_embedding_ivfflat_idx
ON chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## Expected Performance Impact

### Before Indexes
- Vector similarity search: 500-5000ms (sequential scan)
- Keyword search: 100-1000ms (sequential scan)
- Document filtering: 50-500ms (sequential scan)

### After Indexes
- Vector similarity search: 5-50ms (HNSW index)
- Keyword search: 1-10ms (GIN index)
- Document filtering: 1-5ms (B-tree index)
- **Overall hybrid search: 10-100x faster**

## Maintenance

### Reindex (when needed)

```sql
-- Rebuild all indexes (run during low-traffic periods)
REINDEX TABLE chunks;

-- Or rebuild specific indexes
REINDEX INDEX chunks_embedding_hnsw_idx;
REINDEX INDEX chunks_text_gin_idx;
```

### Update Statistics

```sql
-- After bulk data changes
ANALYZE chunks;
```

## Troubleshooting

### Issue: Index creation fails

**Error:** `extension "vector" does not exist`

**Solution:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**Error:** `extension "pg_trgm" does not exist`

**Solution:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Issue: Queries not using indexes

**Check query plan:**
```sql
EXPLAIN ANALYZE
SELECT * FROM chunks
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;
```

**Solution:** Ensure pgvector is configured properly and statistics are up to date:
```sql
ANALYZE chunks;
```

### Issue: HNSW index build is slow

**Expected:** HNSW index creation can take 5-30 minutes for 100K+ chunks

**Monitor progress:**
```sql
SELECT * FROM pg_stat_progress_create_index;
```

## Further Reading

- [pgvector HNSW docs](https://github.com/pgvector/pgvector#hnsw)
- [PostgreSQL GIN indexes](https://www.postgresql.org/docs/current/gin.html)
- [Full-text search in PostgreSQL](https://www.postgresql.org/docs/current/textsearch.html)
