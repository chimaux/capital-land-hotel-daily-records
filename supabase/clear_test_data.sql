begin;

truncate table
  day_approvals,
  expenses,
  department_entries,
  cash_positions
restart identity;

commit;