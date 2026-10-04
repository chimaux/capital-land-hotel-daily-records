-- Run in Supabase Dashboard -> SQL Editor -> New query.
-- Part 1: widen public summary (skip if you already ran it).
-- Part 2: allow Manager/Chima to delete expenses on unapproved days.

drop function if exists get_public_daily_summary(text);

create function get_public_daily_summary(pw text)
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
    order by da.entry_date desc;
end;
$$;

grant execute on function get_public_daily_summary(text) to anon;

-- Part 2: expense delete (needed for the new delete button)
drop policy if exists "manager or chima can delete expenses" on expenses;
create policy "manager or chima can delete expenses" on expenses
  for delete using (my_role() in ('manager','chima') and not is_day_approved(entry_date));
