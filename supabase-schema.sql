create extension if not exists pgcrypto;

create table if not exists leanmate_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists leanmate_attendance (
  member_id uuid not null references leanmate_members(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  primary key (member_id, date)
);

create index if not exists leanmate_attendance_date_idx
  on leanmate_attendance (date);

