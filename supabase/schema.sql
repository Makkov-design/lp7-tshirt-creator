create extension if not exists pgcrypto;

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null unique,
  display_name text not null,
  first_name text not null,
  last_name text not null,
  search_name text not null,
  photo_file_name text,
  photo_url text,
  status text not null default 'waiting' check (status in ('waiting', 'submitted'))
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  participant_id uuid not null references public.participants(id),
  first_name text not null,
  last_name text not null,
  size text not null,
  word_1 text not null,
  word_2 text not null,
  word_3 text not null,
  initials_language text not null default 'RU' check (initials_language in ('RU', 'UA', 'EN')),
  back_name_asset_path text,
  back_name_first_name text,
  back_name_last_name text,
  back_name_text text,
  client_submission_id text
);

create unique index if not exists submissions_participant_id_idx
on public.submissions (participant_id);

create unique index if not exists submissions_client_submission_id_idx
on public.submissions (client_submission_id)
where client_submission_id is not null;

create index if not exists participants_search_name_idx
on public.participants (search_name);
