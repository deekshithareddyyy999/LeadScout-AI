-- LeadScout AI — database schema for Supabase.
-- Run once in Supabase → SQL Editor (the backend reaches Supabase over HTTPS and cannot run DDL itself).
-- Safe to re-run: every statement uses IF NOT EXISTS.
--
-- Security model: Row Level Security is ON for every table with NO policies, so the public
-- anon/publishable key can read or write nothing. Only the backend, using the secret
-- (service_role) key, c
an access these tables.

-- ---------- Accounts ----------
-- One account per email; `domain` is the workspace it belongs to ('bi' = Seeker).
create table if not exists public.users (
  id            bigint generated always as identity primary key,
  email         text not null unique check (email = lower(email)),
  password_hash text not null,                       -- bcrypt; never returned by the API
  full_name     text not null,
  organization  text,                                -- Client accounts only; Seekers are individuals
  domain        text not null check (domain in ('client', 'provider', 'bi')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- Seeker workspace ----------
-- Profile + settings (one row per Seeker). No company fields.
create table if not exists public.seeker_profiles (
  user_id              bigint primary key references public.users (id) on delete cascade,
  full_name            text not null,
  title                text not null default '',
  skills               text[] not null default '{}',
  experience           text not null default '',
  portfolio_url        text not null default '',
  preferred_locations  text[] not null default '{}',
  preferred_categories text[] not null default '{}',
  phone                text not null default '',
  default_radius_km    integer not null default 5 check (default_radius_km in (5, 10, 25, 50)),
  data_source          text not null default 'osm' check (data_source in ('osm', 'google')),
  record_history       boolean not null default true,
  updated_at           timestamptz not null default now()
);

-- Opportunities the Seeker saved. `snapshot` is the record as shown when saved.
-- NOTE before Google Places goes live: Google's terms allow storing the place ID indefinitely but
-- most other place content only temporarily. Saved 'google:' items must then keep only the ID and
-- refresh details from Google when opened (not implemented yet; OpenStreetMap data has no such limit).
create table if not exists public.saved_opportunities (
  id        bigint generated always as identity primary key,
  user_id   bigint not null references public.users (id) on delete cascade,
  kind      text not null check (kind in ('business', 'posting')),
  item_id   text not null,                            -- e.g. 'osm:node/123', 'google:<placeId>', 'posting:<id>'
  snapshot  jsonb not null,
  saved_at  timestamptz not null default now(),
  unique (user_id, item_id)
);
create index if not exists saved_opportunities_user_idx on public.saved_opportunities (user_id, saved_at desc);

-- Searches the Seeker ran (only when record_history is on). Stores the query, never the results.
create table if not exists public.search_history (
  id             bigint generated always as identity primary key,
  user_id        bigint not null references public.users (id) on delete cascade,
  source         text not null check (source in ('location', 'postings')),
  query          jsonb not null,                      -- LocationQuery or PostingFilters
  resolved_label text,                                -- geocoded place name for location searches
  data_source    text check (data_source in ('osm', 'google')),
  result_count   integer not null check (result_count >= 0),
  searched_at    timestamptz not null default now()
);
create index if not exists search_history_user_idx on public.search_history (user_id, searched_at desc);

-- ---------- Lock down the Data API ----------
alter table public.users               enable row level security;
alter table public.seeker_profiles     enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.search_history      enable row level security;
