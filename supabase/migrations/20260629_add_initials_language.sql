alter table public.submissions
add column if not exists initials_language text not null default 'RU'
check (initials_language in ('RU', 'UA', 'EN'));

alter table public.submissions
add column if not exists back_name_asset_path text;
