alter table public.participants enable row level security;
alter table public.submissions enable row level security;

grant usage on schema public to anon, authenticated;
grant usage on schema public to service_role;
grant select on public.participants to anon, authenticated;
grant select on public.submissions to anon, authenticated;
grant select, insert, update on public.participants to service_role;
grant select, insert, update, delete on public.submissions to service_role;

drop policy if exists "Public participants are readable" on public.participants;
create policy "Public participants are readable"
on public.participants
for select
to anon, authenticated
using (true);

drop policy if exists "Public submissions are readable" on public.submissions;
create policy "Public submissions are readable"
on public.submissions
for select
to anon, authenticated
using (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'participants'
  ) then
    alter publication supabase_realtime add table public.participants;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'submissions'
  ) then
    alter publication supabase_realtime add table public.submissions;
  end if;
end $$;
