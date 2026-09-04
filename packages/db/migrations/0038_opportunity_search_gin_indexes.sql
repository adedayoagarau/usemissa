-- Optimizes full-text search, keyword search, and filter queries on opportunities.
-- GIN trgm index accelerates ILIKE and regex searches across search_document and title.
-- GIN tsvector index accelerates lexical full-text queries.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS opportunities_search_document_trgm_gin_idx
ON opportunities USING gin (search_document gin_trgm_ops);

CREATE INDEX IF NOT EXISTS opportunities_title_trgm_gin_idx
ON opportunities USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS opportunities_fulltext_gin_idx
ON opportunities USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(search_document, '')));
