-- Browse filters rely on stable stored values, not a crawler's spelling or
-- punctuation. These updates are intentionally idempotent and are safe to
-- rehearse on a shadow database before any production migration run.

UPDATE opportunities
SET discipline = 'visual-arts', updated_at = now()
WHERE lower(replace(trim(coalesce(discipline, '')), '_', ' ')) IN (
  'visual art',
  'visual arts',
  'visual-arts'
)
  AND discipline <> 'visual-arts';

UPDATE opportunities
SET discipline = 'poetry', updated_at = now()
WHERE lower(trim(coalesce(discipline, ''))) = 'poetry'
  AND discipline <> 'poetry';

UPDATE opportunities
SET discipline = 'fiction', updated_at = now()
WHERE lower(replace(trim(coalesce(discipline, '')), '_', ' ')) IN (
  'fiction',
  'short story',
  'flash fiction'
)
  AND discipline <> 'fiction';

UPDATE opportunities
SET discipline = 'theatre', updated_at = now()
WHERE lower(trim(coalesce(discipline, ''))) IN ('theatre', 'theater')
  AND discipline <> 'theatre';

UPDATE opportunities
SET fee_status = 'no-fee', updated_at = now()
WHERE fee_status = 'free';

UPDATE opportunities
SET fee_status = 'paid', updated_at = now()
WHERE fee_status = 'fee';
