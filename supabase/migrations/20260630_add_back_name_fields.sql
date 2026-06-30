alter table public.submissions
add column if not exists back_name_first_name text;

alter table public.submissions
add column if not exists back_name_last_name text;

alter table public.submissions
add column if not exists back_name_text text;

notify pgrst, 'reload schema';
