-- Drop any streak/achievement tables or views if they were created earlier
drop table if exists public.streaks cascade;
drop table if exists public.achievements cascade;
drop view if exists public.streaks_view cascade;

-- Remove any policies named for streaks (ignore if not present)
do $$
begin
  perform 1
  from pg_policies
  where schemaname='public' and tablename in ('streaks','achievements');
exception when others then
  null;
end $$;

-- Not strictly needed, but refresh PostgREST cache if any schema changed
notify pgrst, 'reload schema';
