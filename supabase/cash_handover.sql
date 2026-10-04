-- ============================================================
-- Cash handover: departments record cash given to Manager / Chima.
-- Run in Supabase Dashboard -> SQL Editor -> New query.
-- Safe to re-run.
-- ============================================================

begin;

-- 1. What each department handed over.
alter table department_entries
  add column if not exists handed_manager numeric(12,2) not null default 0,
  add column if not exists handed_chima   numeric(12,2) not null default 0;

-- 2. Optional Chima overrides. NULL = use the departments' totals automatically.
alter table cash_positions
  add column if not exists cash_manager_override numeric(12,2),
  add column if not exists cash_chima_override   numeric(12,2);

-- Keep the figures already recorded for past days exactly as they were.
update cash_positions
set cash_manager_override = cash_manager,
    cash_chima_override   = cash_chima
where cash_manager_override is null
  and cash_chima_override is null;

-- 3. Only Chima can write the cash position (and only while the day is open).
drop policy if exists "manager or chima can set cash position" on cash_positions;
drop policy if exists "manager or chima can update cash position" on cash_positions;
drop policy if exists "chima can set cash position" on cash_positions;
drop policy if exists "chima can update cash position" on cash_positions;

create policy "chima can set cash position" on cash_positions
  for insert with check (my_role() = 'chima' and not is_day_approved(entry_date));
create policy "chima can update cash position" on cash_positions
  for update using (my_role() = 'chima' and not is_day_approved(entry_date))
  with check (my_role() = 'chima' and not is_day_approved(entry_date));

-- 4. Public page: cash with Manager / Chima = Chima's override, else the departments' total.
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
      coalesce(cp.cash_manager_override, sum(de.handed_manager), 0),
      coalesce(cp.cash_chima_override,   sum(de.handed_chima),   0)
    from day_approvals da
    left join department_entries de on de.entry_date = da.entry_date
    left join cash_positions cp on cp.entry_date = da.entry_date
    where da.approved = true
    group by da.entry_date, cp.account_balance, cp.cash_manager_override, cp.cash_chima_override
    order by da.entry_date desc
    limit p_limit offset p_offset;
end;
$$;
grant execute on function get_public_daily_summary_paged(text, int, int) to anon;

commit;