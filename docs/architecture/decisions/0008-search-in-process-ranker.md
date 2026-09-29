# ADR 0008: In-process search ranker

Status: Accepted (2026-09-30). Quick reference: D9.

## Context

CS-10 wants live suggestions and results by product name. Catalogue is small; running Elasticsearch/Typesense would add cost and ops.

## Decision

Pure ranker `src/domain/search.ts` (normalisation, prefix, substring, one-typo edit distance) used by the client over `/api/search-index` (small JSON) and by the server `/search` page.

## Alternatives considered

- Postgres FTS/pg_trgm now: more SQL and a round trip per keystroke.
- Typesense/Meilisearch/Algolia: infra or vendor cost not justified.

## Consequences

- Instant suggestions, zero infra, unit-testable.

* Limited relevance features and scale; upgrade path in scaling.md (pg_trgm/FTS, then Typesense/Meilisearch).
