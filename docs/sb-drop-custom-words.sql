drop table if exists public.custom_words cascade;
drop function if exists public.upsert_custom_word(text, jsonb) cascade;
drop function if exists public.delete_custom_word(text, text) cascade;
notify pgrst, 'reload schema';
