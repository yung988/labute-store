-- Email Logs schema for admin communications
-- Run this SQL in Supabase SQL Editor or via supabase db push

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  order_id text null,
  customer_email text not null,
  email_type text not null,
  subject text not null,
  status text not null check (status in ('queued','sent','delivered','opened','failed','bounced')),
  provider text not null default 'resend',
  provider_id text null,
  failed_reason text null,
  email_content text null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  sent_at timestamptz null default now(),
  delivered_at timestamptz null,
  opened_at timestamptz null
);

-- Helpful index for admin filters
create index if not exists idx_email_logs_order_id on public.email_logs(order_id);
create index if not exists idx_email_logs_customer_email on public.email_logs(customer_email);
create index if not exists idx_email_logs_status on public.email_logs(status);
create index if not exists idx_email_logs_created_at on public.email_logs(created_at desc);

-- RLS (optional). Admin API uses service role; enable RLS but allow service role to bypass.
alter table public.email_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'email_logs' and policyname = 'allow_service_role'
  ) then
    create policy allow_service_role on public.email_logs
      for all
      using (true)
      with check (true);
  end if;
end $$;

