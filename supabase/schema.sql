-- Stall Talk / Potty Favor publishing schema for Supabase.
-- Run this in the Supabase SQL editor. Use anon keys from the browser; never expose service_role keys.

create extension if not exists pgcrypto;

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  location text,
  active boolean not null default true,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_name text,
  headline text,
  offer text,
  cta text,
  slot_id text not null default 'content-ad',
  placement integer not null,
  width integer not null default 320,
  height integer not null default 100,
  image_url text not null,
  click_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  constraint campaigns_content_ad_size check (slot_id = 'content-ad' and width = 320 and height = 100),
  venue_id text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  published_at timestamp with time zone
);

create index if not exists campaigns_status_slot_placement_idx on public.campaigns (status, slot_id, placement, published_at desc);
create index if not exists campaigns_venue_status_idx on public.campaigns (venue_id, status, published_at desc);
create index if not exists venues_slug_idx on public.venues (slug);

alter table public.venues enable row level security;
alter table public.campaigns enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'venues' and policyname = 'Public can read active venues') then
    create policy "Public can read active venues" on public.venues
      for select using (active = true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'campaigns' and policyname = 'Public can read published campaigns') then
    create policy "Public can read published campaigns" on public.campaigns
      for select using (status = 'published');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'campaigns' and policyname = 'Authenticated users can manage campaigns') then
    create policy "Authenticated users can manage campaigns" on public.campaigns
      for all to authenticated using (true) with check (true);
  end if;
end $$;
