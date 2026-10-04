-- ============================================================
-- Hotel Daily Records — Supabase schema
-- Run this in Supabase Dashboard → SQL Editor → New query
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Tables ----------

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('receptionist','bartender','chef','manager','chima')),
  display_name text
);

create table if not exists department_entries (
  id bigint generated always as identity primary key,
  entry_date date not null,
  department text not null check (department in ('room','bar','kitchen')),
  cash numeric(12,2) not null default 0,
  pos numeric(12,2) not null default 0,
  transfer numeric(12,2) not null default 0,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  unique (entry_date, department)
);

create table if not exists expenses (
  id bigint generated always as identity primary key,
  entry_date date not null,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists cash_positions (
  entry_date date primary key,
  account_balance numeric(12,2) not null default 0,
  cash_manager numeric(12,2) not null default 0,
  cash_chima numeric(12,2) not null default 0,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists day_approvals (
  entry_date date primary key,
  approved boolean not null default false,
  approved_by uuid references profiles(id),
  approved_at timestamptz
);

-- Locked-down table: only ever touched via the security-definer functions below.
create table if not exists app_settings (
  key text primary key,
  value text
);

-- ---------- Helper functions ----------

create or replace function my_role() returns text
language sql stable as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function my_department() returns text
language sql stable as $$
  select case my_role()
    when 'receptionist' then 'room'
    when 'bartender' then 'bar'
    when 'chef' then 'kitchen'
    else null
  end;
$$;

create or replace function is_day_approved(d date) returns boolean
language sql stable as $$
  select coalesce((select approved from day_approvals where entry_date = d), false);
$$;

-- ---------- Row Level Security ----------

alter table profiles enable row level security;
alter table department_entries enable row level security;
alter table expenses enable row level security;
alter table cash_positions enable row level security;
alter table day_approvals enable row level security;
alter table app_settings enable row level security; -- no policies granted: locked to service role + functions only

create policy "staff can read profiles" on profiles
  for select using (auth.role() = 'authenticated');

create policy "staff can read entries" on department_entries
  for select using (auth.role() = 'authenticated');
create policy "own department can insert" on department_entries
  for insert with check (department = my_department() and not is_day_approved(entry_date));
create policy "own department can update" on department_entries
  for update using (department = my_department() and not is_day_approved(entry_date))
  with check (department = my_department() and not is_day_approved(entry_date));

create policy "staff can read expenses" on expenses
  for select using (auth.role() = 'authenticated');
create policy "manager or chima can add expenses" on expenses
  for insert with check (my_role() in ('manager','chima') and not is_day_approved(entry_date));

create policy "staff can read cash position" on cash_positions
  for select using (auth.role() = 'authenticated');
create policy "manager or chima can set cash position" on cash_positions
  for insert with check (my_role() in ('manager','chima') and not is_day_approved(entry_date));
create policy "manager or chima can update cash position" on cash_positions
  for update using (my_role() in ('manager','chima') and not is_day_approved(entry_date))
  with check (my_role() in ('manager','chima') and not is_day_approved(entry_date));

create policy "staff can read approvals" on day_approvals
  for select using (auth.role() = 'authenticated');
create policy "chima can insert approvals" on day_approvals
  for insert with check (my_role() = 'chima');
create policy "chima can update approvals" on day_approvals
  for update using (my_role() = 'chima') with check (my_role() = 'chima');

-- ---------- Public access: password-gated, no direct table grants to anon ----------

create or replace function verify_public_password(pw text) returns boolean
language sql security definer as $$
  select exists (
    select 1 from app_settings
    where key = 'public_password_hash' and value = crypt(pw, value)
  );
$$;
grant execute on function verify_public_password(text) to anon, authenticated;

create or replace function set_public_password(new_pw text) returns void
language plpgsql security definer as $$
begin
  if my_role() not in ('manager','chima') then
    raise exception 'not authorized';
  end if;
  insert into app_settings(key, value) values ('public_password_hash', crypt(new_pw, gen_salt('bf')))
  on conflict (key) do update set value = excluded.value;
end;
$$;
grant execute on function set_public_password(text) to authenticated;

create or replace function get_public_daily_summary(pw text)
returns table (
  entry_date date, room_total numeric, bar_total numeric, kitchen_total numeric,
  total_cash numeric, total_pos numeric, total_transfer numeric, total_expenses numeric
)
language plpgsql security definer as $$
begin
  if not verify_public_password(pw) then
    raise exception 'invalid password';
  end if;
  return query
    select
      da.entry_date,
      coalesce(sum(case when de.department = 'room' then de.cash + de.pos + de.transfer else 0 end), 0),
      coalesce(sum(case when de.department = 'bar' then de.cash + de.pos + de.transfer else 0 end), 0),
      coalesce(sum(case when de.department = 'kitchen' then de.cash + de.pos + de.transfer else 0 end), 0),
      coalesce(sum(de.cash), 0),
      coalesce(sum(de.pos), 0),
      coalesce(sum(de.transfer), 0),
      coalesce((select sum(amount) from expenses e where e.entry_date = da.entry_date), 0)
    from day_approvals da
    left join department_entries de on de.entry_date = da.entry_date
    where da.approved = true
    group by da.entry_date
    order by da.entry_date desc;
end;
$$;
grant execute on function get_public_daily_summary(text) to anon;

create or replace function get_public_expenses(pw text)
returns table (entry_date date, description text, amount numeric)
language plpgsql security definer as $$
begin
  if not verify_public_password(pw) then
    raise exception 'invalid password';
  end if;
  return query
    select e.entry_date, e.description, e.amount
    from expenses e
    join day_approvals da on da.entry_date = e.entry_date
    where da.approved = true
    order by e.entry_date desc;
end;
$$;
grant execute on function get_public_expenses(text) to anon;

-- ---------- Seed the initial public password (change this!) ----------
-- Run directly in the SQL Editor (bypasses RLS as the table owner), so this
-- works before any staff account exists. Change the password from the app
-- later via Manager/Chima → set_public_password, or re-run this line.
insert into app_settings(key, value) values ('public_password_hash', crypt('hotel123', gen_salt('bf')))
on conflict (key) do update set value = excluded.value;
