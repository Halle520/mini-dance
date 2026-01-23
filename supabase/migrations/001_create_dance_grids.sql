create table if not exists dance_grids (
  id uuid primary key default gen_random_uuid(),
  user_name text unique not null,
  grid jsonb not null default '[[false]]',
  row_notes jsonb not null default '[]',
  updated_at timestamptz default now()
);

create index if not exists dance_grids_user_name on dance_grids(user_name);
