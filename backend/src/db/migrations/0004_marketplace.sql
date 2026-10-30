-- LeadScout AI — business profiles, posted requirements and applications (connects Client and Seeker).
-- Run once in Supabase → SQL Editor, after 0003. Safe to re-run (IF NOT EXISTS).
-- RLS on with no policies: only the backend (secret key) can read or write these tables.

-- A Client account's business details. The Google link is optional ("Verified on Google").
-- Google's terms allow keeping the place ID; rating and review count are refreshed from Google when older than 30 days.
create table if not exists public.business_profiles (
  user_id             bigint primary key references public.users (id) on delete cascade,
  business_name       text not null default '',
  category            text not null default '',
  area                text not null default '',
  city                text not null default '',
  website             text not null default '',
  contact_name        text not null default '',
  phone               text not null default '',
  about               text not null default '',
  google_place_id     text,
  google_name         text,
  google_rating       numeric(2, 1),
  google_review_count integer,
  google_maps_url     text,
  google_checked_at   timestamptz,
  updated_at          timestamptz not null default now()
);

-- Requirements a business posts. Seekers see the open ones as "Posted Opportunities".
create table if not exists public.postings (
  id               bigint generated always as identity primary key,
  client_id        bigint not null references public.users (id) on delete cascade,
  title            text not null,
  summary          text not null,                    -- the one-line business problem
  description      text not null,
  expected_outcome text not null default '',
  service          text not null default 'other'
    check (service in ('website', 'website-upgrade', 'seo', 'social-media', 'marketing', 'design', 'photography', 'other')),
  skills           text[] not null default '{}',
  experience       text not null default 'open' check (experience in ('mid', 'senior', 'lead', 'open')),
  budget_type      text not null default 'project' check (budget_type in ('project', 'daily', 'monthly')),
  budget_min       integer check (budget_min >= 0),
  budget_max       integer check (budget_max >= 0),
  budget_open      boolean not null default false,  -- "Open to quotes"
  currency         text not null default 'INR',
  deadline         date,
  work_mode        text not null default 'remote' check (work_mode in ('remote', 'onsite', 'hybrid')),
  location         text not null default '',
  additional_info  text not null default '',
  status           text not null default 'open' check (status in ('open', 'reviewing', 'closed')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists postings_status_idx on public.postings (status, created_at desc);
create index if not exists postings_client_idx on public.postings (client_id, created_at desc);

-- A Seeker's application to a posting. `match` holds the explained match once the business runs AI matching.
create table if not exists public.applications (
  id           bigint generated always as identity primary key,
  posting_id   bigint not null references public.postings (id) on delete cascade,
  seeker_id    bigint not null references public.users (id) on delete cascade,
  proposal     text not null,
  quote_amount integer check (quote_amount >= 0),
  timeline     text not null default '',
  status       text not null default 'new' check (status in ('new', 'in_review', 'shortlisted', 'declined')),
  match        jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (posting_id, seeker_id)
);
create index if not exists applications_posting_idx on public.applications (posting_id);
create index if not exists applications_seeker_idx on public.applications (seeker_id);

alter table public.business_profiles enable row level security;
alter table public.postings          enable row level security;
alter table public.applications      enable row level security;
