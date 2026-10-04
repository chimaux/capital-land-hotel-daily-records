-- ============================================================
-- Pagination for the public records page.
-- Run in Supabase Dashboard -> SQL Editor -> New query.
--
-- ADDITIVE ONLY: creates three new functions with a _paged suffix.
-- Nothing is dropped or altered, so get_public_daily_summary and
-- get_public_expenses keep working exactly as they do today.
-- Safe to re-run (create or replace).
-- ============================================================

begin;

-- 1. One page of approved days (same columns/logic as your current summary).
create or replace function get_public_daily_summary_paged(
  pw text,
  p_limit int default 10,
  p_offset int default 0
)
returns table (
  entry_date date,
  room_cash numeric, room_pos numeric, room_transfer numeric, room_total numeric,
  bar_cash numeric, bar_pos numeric, bar_transfer numeric, bar_total numeric,
  kitchen_cash numeric, kitchen_pos numeric, kitchen_transfer numeric, kitchen_total numeric,
  total_cash numeric, total_pos numeric, total_transfer numeric, total_income numeric,
  total_expenses numeric, net numeric,
  account_balance numeric, cash_manager numeric, cash_chima numeric
)
language plpgsql security definer as $$
begin
  if not verify_public_password(pw) then
    raise exception 'invalid password';
  end if;
  return query
    select
      da.entry_date,
      coalesce(sum(de.cash)     filter (where de.department = 'room'), 0),
      coalesce(sum(de.pos)      filter (where de.department = 'room'), 0),
      coalesce(sum(de.transfer) filter (where de.department = 'room'), 0),
      coalesce(sum(de.cash + de.pos + de.transfer) filter (where de.department = 'room'), 0),
      coalesce(sum(de.cash)     filter (where de.department = 'bar'), 0),
      coalesce(sum(de.pos)      filter (where de.department = 'bar'), 0),
      coalesce(sum(de.transfer) filter (where de.department = 'bar'), 0),
      coalesce(sum(de.cash + de.pos + de.transfer) filter (where de.department = 'bar'), 0),
      coalesce(sum(de.cash)     filter (where de.department = 'kitchen'), 0),
      coalesce(sum(de.pos)      filter (where de.department = 'kitchen'), 0),
      coalesce(sum(de.transfer) filter (where de.department = 'kitchen'), 0),
      coalesce(sum(de.cash + de.pos + de.transfer) filter (where de.department = 'kitchen'), 0),
      coalesce(sum(de.cash), 0),
      coalesce(sum(de.pos), 0),
      coalesce(sum(de.transfer), 0),
      coalesce(sum(de.cash + de.pos + de.transfer), 0),
      coalesce((select sum(e.amount) from expenses e where e.entry_date = da.entry_date), 0),
      coalesce(sum(de.cash + de.pos + de.transfer), 0)
        - coalesce((select sum(e.amount) from expenses e where e.entry_date = da.entry_date), 0),
      coalesce(cp.account_balance, 0),
      coalesce(cp.cash_manager, 0),
      coalesce(cp.cash_chima, 0)
    from day_approvals da
    left join department_entries de on de.entry_date = da.entry_date
    left join cash_positions cp on cp.entry_date = da.entry_date
    where da.approved = true
    group by da.entry_date, cp.account_balance, cp.cash_manager, cp.cash_chima
    order by da.entry_date desc
    limit p_limit offset p_offset;
end;
$$;
grant execute on function get_public_daily_summary_paged(text, int, int) to anon;

-- 2. Expenses for exactly the same page of days.
create or replace function get_public_expenses_paged(
  pw text,
  p_limit int default 10,
  p_offset int default 0
)
returns table (entry_date date, description text, amount numeric)
language plpgsql security definer as $$
begin
  if not verify_public_password(pw) then
    raise exception 'invalid password';
  end if;
  return query
    select e.entry_date, e.description, e.amount
    from expenses e
    join (
      select da.entry_date
      from day_approvals da
      where da.approved = true
      order by da.entry_date desc
      limit p_limit offset p_offset
    ) page_days on page_days.entry_date = e.entry_date
    order by e.entry_date desc, e.created_at, e.id;
end;
$$;
grant execute on function get_public_expenses_paged(text, int, int) to anon;

-- 3. Total number of approved days, for the pagination control.
create or replace function get_public_day_count(pw text)
returns int
language plpgsql security definer as $$
begin
  if not verify_public_password(pw) then
    raise exception 'invalid password';
  end if;
  return (select count(*)::int from day_approvals da where da.approved = true);
end;
$$;
grant execute on function get_public_day_count(text) to anon;

-- Optional: speeds up the per-day expense lookups as the table grows.
create index if not exists expenses_entry_date_idx on expenses (entry_date);

commit;

-- To undo everything (old functions are untouched either way):
--   drop function if exists get_public_daily_summary_paged(text, int, int);
--   drop function if exists get_public_expenses_paged(text, int, int);
--   drop function if exists get_public_day_count(text);
--   drop index if exists expenses_entry_date_idx;
