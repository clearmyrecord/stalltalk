-- Ensure production databases have the Role enum before auth tables or seed users reference it.
-- This is intentionally defensive for deployments where earlier auth migration attempts failed
-- after creating tables but before creating the enum in the public schema.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'VENUE_MANAGER', 'ADVERTISER', 'DISTRIBUTOR', 'VENUE');
  END IF;
END $$;

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'VENUE_MANAGER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DISTRIBUTOR';
