BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS can_access_services BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_access_policies BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_access_categories BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS profile_image TEXT;

UPDATE users
SET can_access_services = TRUE,
    can_access_policies = TRUE,
    can_access_categories = TRUE
WHERE role = 'admin';

COMMIT;
