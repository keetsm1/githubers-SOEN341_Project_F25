-- SQL to create a payments table and a mock RPC for processing payments
-- Save this file and paste into the Supabase SQL editor (or run via psql)

-- 1) extension for gen_random_uuid (pgcrypto)
create extension if not exists "pgcrypto";

-- 2) payments table
create table if not exists public.payments (
  payment_id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  user_id uuid,
  amount numeric not null default 0,
  status text not null,
  message text,
  created_at timestamptz default now()
);

create index if not exists payments_event_idx on public.payments (event_id);
create index if not exists payments_user_idx on public.payments (user_id);
create index if not exists payments_created_idx on public.payments (created_at desc);

-- Compatibility: ensure other tables have the columns the RPC will update
alter table public.tickets
  add column if not exists is_paid boolean default false;

alter table public.registrations
  add column if not exists is_paid boolean default false;

alter table public.events
  add column if not exists price numeric default 0;

alter table public.events
  add column if not exists is_paid boolean default false;

-- 3) mock RPC: accepts optional user id so you can test from SQL editor
--    This RPC inserts a payment row and (on success) marks related ticket/registration rows as paid.
create or replace function public.mock_process_payment(
  p_event_id uuid,
  p_amount numeric,
  p_user_id uuid default null
)
returns table(payment_id uuid, status text, message text)
language plpgsql
security definer
as $$
declare
  uid uuid;
  pid uuid;
  p_status text;
  p_msg text;
begin
  -- Resolve user: prefer explicit param (useful for SQL editor testing), else try the authenticated user
  if p_user_id is not null then
    uid := p_user_id;
  else
    begin
      uid := auth.uid();
    exception when others then
      uid := null;
    end;
  end if;

  -- Simulate 80% success rate (matches client fallback behavior)
  if random() < 0.8 then
    p_status := 'success';
    p_msg := 'Mock payment succeeded (server)';
  else
    p_status := 'failure';
    p_msg := 'Mock payment failed (server)';
  end if;

  insert into public.payments(payment_id, event_id, user_id, amount, status, message, created_at)
    values (gen_random_uuid(), p_event_id, uid, coalesce(p_amount, 0), p_status, p_msg, now())
    returning public.payments.payment_id into pid;

  -- If payment succeeded, attempt to mark tickets/registrations as paid for this user+event
  if p_status = 'success' and uid is not null then
    begin
      -- Best-effort updates; ignore errors so RPC still returns success
      update public.tickets
        set is_paid = true
        where event_id = p_event_id and user_id = uid;
    exception when others then
      -- ignore
    end;

    begin
      update public.registrations
        set is_paid = true
        where event_id = p_event_id and user_id = uid;
    exception when others then
      -- ignore
    end;
  end if;

  payment_id := pid;
  status := p_status;
  message := p_msg;
  return next;
end;
$$;

-- 4) Optional convenience function to query latest payment for a user/event
create or replace function public.get_latest_payment(p_event_id uuid, p_user_id uuid)
returns table(payment_id uuid, amount numeric, status text, message text, created_at timestamptz)
language sql
security definer
as $$
  select payment_id, amount, status, message, created_at
  from public.payments
  where event_id = p_event_id and user_id = p_user_id
  order by created_at desc
  limit 1;
$$;

-- End of script
