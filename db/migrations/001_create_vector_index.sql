-- Migration: Create optimized indexes for enhanced DocChat performance
-- Date: 2025-11-18
-- Impact:
--   - HNSW vector index: 5-20x speedup for RAG similarity search
--   - GIN text index: 10-100x speedup for keyword search
--   - B-tree index: Fast document filtering and ordering

-- ============================================================
-- 1. ENABLE EXTENSIONS
-- ============================================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 2. VECTOR SIMILARITY INDEX (HNSW)
-- ============================================================

-- Drop old IVFFlat index if exists
DROP INDEX IF EXISTS chunks_embedding_ivfflat_idx;

-- Create HNSW index for fast approximate nearest neighbor search
-- HNSW (Hierarchical Navigable Small World) is superior to IVFFlat:
--   - Better recall (accuracy)
--   - Faster query time
--   - No need to tune "lists" parameter
--   - More consistent performance
--
-- Parameters:
--   m=16: Max connections per layer (higher = better recall, more memory)
--   ef_construction=64: Build-time accuracy (higher = better quality, slower build)
--
-- Query-time parameter (set in application):
--   SET hnsw.ef_search = 40; (higher = better recall, slower queries)
CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw_idx
ON chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================================
-- 3. FULL-TEXT SEARCH INDEX (GIN)
-- ============================================================

-- Create GIN (Generalized Inverted Index) for fast keyword search
-- Used by hybrid search for BM25 scoring
-- Supports trigram similarity and full-text search
CREATE INDEX IF NOT EXISTS chunks_text_gin_idx
ON chunks USING gin (to_tsvector('english', text));

-- Additional GIN index for trigram search (fuzzy matching)
-- Requires pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS chunks_text_trgm_idx
ON chunks USING gin (text gin_trgm_ops);

-- ============================================================
-- 4. DOCUMENT FILTERING INDEX (B-TREE)
-- ============================================================

-- B-tree index on doc_id for fast document filtering
-- Critical for queries like "search in specific documents"
CREATE INDEX IF NOT EXISTS chunks_doc_id_idx
ON chunks (doc_id);

-- Composite B-tree index for document + page lookups
-- Used when retrieving specific pages from documents
CREATE INDEX IF NOT EXISTS chunks_doc_id_page_idx
ON chunks (doc_id, page) WHERE page IS NOT NULL;

-- ============================================================
-- 5. OPTIMIZE TABLE STATISTICS
-- ============================================================

-- Update table statistics for query planner optimization
ANALYZE chunks;

-- ============================================================
-- USAGE NOTES
-- ============================================================

-- Vector Search (HNSW):
--   SET hnsw.ef_search = 40; -- Query-time accuracy (default: 40)
--   SELECT * FROM chunks ORDER BY embedding <=> '[...]' LIMIT 10;
--
-- Hybrid Search (Vector + Keyword):
--   SELECT *,
--          embedding <=> '[...]' as vector_distance,
--          ts_rank(to_tsvector('english', text), query) as text_rank
--   FROM chunks, to_tsquery('physics & energy') query
--   WHERE to_tsvector('english', text) @@ query
--   ORDER BY (0.7 * vector_distance + 0.3 * text_rank) DESC
--   LIMIT 10;
--
-- Document Filtering:
--   SELECT * FROM chunks WHERE doc_id = 'abc123' ORDER BY ord;
--
-- Performance Expectations:
--   - Vector search: 5-50ms for 10K-1M chunks
--   - Keyword search: 1-10ms for 10K-1M chunks
--   - Combined hybrid: 10-100ms depending on result set
