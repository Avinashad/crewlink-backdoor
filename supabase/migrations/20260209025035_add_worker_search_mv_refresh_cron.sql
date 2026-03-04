CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

SELECT cron.schedule(
  'refresh-worker-search-mv',
  '*/5 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY worker_search_mv$$
);
