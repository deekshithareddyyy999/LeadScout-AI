-- LeadScout AI — lead tracker for saved opportunities.
-- Run once in Supabase → SQL Editor, after 0002. Safe to re-run (IF NOT EXISTS).
-- Adds a pipeline status, private notes and a follow-up date to each saved opportunity.

alter table public.saved_opportunities
  add column if not exists status text not null default 'new'
    check (status in ('new', 'contacted', 'replied', 'won', 'lost')),
  add column if not exists notes text not null default '',
  add column if not exists follow_up_on date,
  add column if not exists updated_at timestamptz not null default now();

-- Find a Seeker's leads by status quickly (the Saved page filters by it).
create index if not exists saved_opportunities_status_idx on public.saved_opportunities (user_id, status);
