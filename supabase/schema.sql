create table if not exists public.app_state (
  id integer primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

comment on table public.app_state is
  'Single persisted Oims application state. Accessed only by server-side API routes using the Supabase service role.';
