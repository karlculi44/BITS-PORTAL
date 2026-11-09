BEGIN;

-- Safety check: (name, type) must already be unique before the new rule applies.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM categories GROUP BY name, type HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate category names exist within the same type; resolve them (rename, do not delete) before migrating';
  END IF;
END $$;

-- Drop every unique constraint / standalone unique index that covers only "name".
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'public.categories'::regclass
      AND con.contype = 'u'
      AND (SELECT array_agg(att.attname::text)
           FROM unnest(con.conkey) AS k(attnum)
           JOIN pg_attribute att
             ON att.attrelid = con.conrelid AND att.attnum = k.attnum) = ARRAY['name']
  LOOP
    EXECUTE format('ALTER TABLE public.categories DROP CONSTRAINT %I', rec.conname);
  END LOOP;

  FOR rec IN
    SELECT i.relname
    FROM pg_index x
    JOIN pg_class i ON i.oid = x.indexrelid
    WHERE x.indrelid = 'public.categories'::regclass
      AND x.indisunique
      AND NOT x.indisprimary
      AND x.indpred IS NULL
      AND x.indnatts = 1
      AND (SELECT attname FROM pg_attribute
           WHERE attrelid = x.indrelid AND attnum = x.indkey[0]) = 'name'
      AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = x.indexrelid)
  LOOP
    EXECUTE format('DROP INDEX public.%I', rec.relname);
  END LOOP;
END $$;

ALTER TABLE public.categories
  ADD CONSTRAINT categories_name_type_key UNIQUE (name, type);

COMMIT;
