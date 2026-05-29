alter table public.expenses
  add column if not exists payment_card text
  check (payment_card is null or length(payment_card) between 1 and 30);

create index if not exists expenses_payment_card_idx
  on public.expenses (payment_card)
  where payment_card is not null;
