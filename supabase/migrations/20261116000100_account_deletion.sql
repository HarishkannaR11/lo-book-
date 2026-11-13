-- Anyone signed in can delete their own account from the app, as Google Play requires.
-- Deleting the auth user cascades through owners to every vehicle, driver, party, trip,
-- expense, payment and document row they own (all owner_id foreign keys are ON DELETE
-- CASCADE). A driver's own login can be deleted too; the owner's records of that driver stay,
-- and expenses they entered keep their amounts with entered_by_user_id set to null.
-- Photos are not touched here: Supabase only allows removing them through the Storage API,
-- so the server action removes them first, as the user, before calling this.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
