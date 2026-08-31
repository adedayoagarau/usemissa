CREATE OR REPLACE FUNCTION missa_aggregate_record_publication_gate()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  source_url text;
BEGIN
  IF NEW.publication_state <> 'published' THEN RETURN NEW; END IF;

  SELECT s.url INTO source_url FROM opportunity_sources s WHERE s.id = NEW.source_id;
  IF lower(coalesce(source_url, '')) LIKE 'https://www.artconnect.com/opportunities%'
     AND (
       NEW.title ~* '^(Next\s*(-|&gt;|→)*|ArtConnect page [0-9]+|Opportunities without fees|Art Contests|Opportunities for Artists in .+|[^,]+,\s*[A-Z]{2},\s*[^,]+)$'
       OR coalesce(source_url, '') ~ '[?&](page|country|state|city|sortBy)='
     ) THEN
    RAISE EXCEPTION 'Publication gates failed for opportunity %: aggregate directory record', NEW.id USING ERRCODE = '23514';
  END IF;
  IF lower(coalesce(source_url, '')) ~ '^https://(www\.)?openartsforum\.com/opportunities/\?[^#]*tag=' THEN
    RAISE EXCEPTION 'Publication gates failed for opportunity %: aggregate directory record', NEW.id USING ERRCODE = '23514';
  END IF;
  IF lower(coalesce(source_url, '')) ~ '^https://(www\.)?on-the-move\.org/(news/deadlines/?|resources/funding(?:/.*)?)$' THEN
    RAISE EXCEPTION 'Publication gates failed for opportunity %: aggregate directory record', NEW.id USING ERRCODE = '23514';
  END IF;
  IF lower(coalesce(source_url, '')) ~ '^https://(www\.)?curatorspace\.com/opportunities/index(?:/.*)?(?:\?.*)?$'
     OR lower(coalesce(source_url, '')) ~ '^https://(www\.)?transartists\.org/en/(air/.*|deadlines/?|transartists-calls/?)$' THEN
    RAISE EXCEPTION 'Publication gates failed for opportunity %: aggregate directory or organization profile record', NEW.id USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS missa_aggregate_record_publication_gate_trigger ON opportunities;
CREATE CONSTRAINT TRIGGER missa_aggregate_record_publication_gate_trigger
  AFTER INSERT OR UPDATE OF publication_state, source_id, title
  ON opportunities
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION missa_aggregate_record_publication_gate();

WITH aggregate_records AS (
  SELECT o.id
  FROM opportunities o
  LEFT JOIN opportunity_sources s ON s.id = o.source_id
  WHERE lower(coalesce(s.url, '')) LIKE 'https://www.artconnect.com/opportunities%'
    AND (
      o.title ~* '^(Next\s*(-|&gt;|→)*|ArtConnect page [0-9]+|Opportunities without fees|Art Contests|Opportunities for Artists in .+|[^,]+,\s*[A-Z]{2},\s*[^,]+)$'
      OR coalesce(s.url, '') ~ '[?&](page|country|state|city|sortBy)='
    )
)
UPDATE opportunities o
SET publication_state = 'suppressed', status = 'archived', deadline_kind = 'unknown', updated_at = now()
FROM aggregate_records a
WHERE o.id = a.id
  AND (o.publication_state <> 'suppressed' OR o.status <> 'archived' OR o.deadline_kind <> 'unknown');
