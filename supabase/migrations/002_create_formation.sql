create table if not exists formation (
  id int primary key default 1 check (id = 1),
  positions jsonb not null default '[]'
);

insert into formation (id, positions) values (1, '[]')
on conflict (id) do nothing;
