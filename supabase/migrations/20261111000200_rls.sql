-- Row Level Security. Every table is owner-scoped; drivers get exactly two narrow rights.
--
-- RLS filters rows, not columns. So the only way to keep freight_amount away from a driver
-- is for the driver to have no row access to trips at all. The trips table therefore has
-- an owner policy and nothing else. A driver learns about their open trip only through
-- public.driver_open_trips(), which returns no money columns.

alter table public.owners            enable row level security;
alter table public.vehicles          enable row level security;
alter table public.vehicle_documents enable row level security;
alter table public.drivers           enable row level security;
alter table public.parties           enable row level security;
alter table public.trips             enable row level security;
alter table public.trip_expenses     enable row level security;
alter table public.payments          enable row level security;

-- Nothing is readable or writable signed-out. TRUNCATE bypasses RLS, so nobody gets it.
revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- ---------------------------------------------------------------------------
-- Driver identity. A driver is any signed-in user whose verified phone matches an active
-- drivers row. Security definer so the check can read auth.users and trips without
-- granting the driver any access to them.
-- ---------------------------------------------------------------------------

create function private.current_driver_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select d.id
  from public.drivers d
  join auth.users u on u.phone = d.phone
  where u.id = (select auth.uid()) and d.is_active
$$;

create function private.is_driver_on_open_trip(p_trip_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.trips t
    where t.id = p_trip_id
      and t.status = 'open'
      and t.driver_id in (select private.current_driver_ids())
  )
$$;

revoke all on all functions in schema private from public;
grant execute on function private.current_driver_ids() to authenticated;
grant execute on function private.is_driver_on_open_trip(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Owner policies
-- ---------------------------------------------------------------------------

create policy owners_self_select on public.owners for select to authenticated
  using (id = (select auth.uid()));
create policy owners_self_insert on public.owners for insert to authenticated
  with check (id = (select auth.uid()));
create policy owners_self_update on public.owners for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy vehicles_owner on public.vehicles for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy drivers_owner on public.drivers for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy parties_owner on public.parties for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy vehicle_documents_owner on public.vehicle_documents for all to authenticated
  using (exists (select 1 from public.vehicles v
                 where v.id = vehicle_id and v.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.vehicles v
                      where v.id = vehicle_id and v.owner_id = (select auth.uid())));

-- Trips: owner only. No delete; a wrong trip is cancelled so the ledger keeps its history.
create policy trips_owner_select on public.trips for select to authenticated
  using (owner_id = (select auth.uid()));
create policy trips_owner_insert on public.trips for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy trips_owner_update on public.trips for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy payments_owner on public.payments for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy trip_expenses_owner on public.trip_expenses for all to authenticated
  using (exists (select 1 from public.trips t
                 where t.id = trip_id and t.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.trips t
                      where t.id = trip_id and t.owner_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- Driver policies: read and insert expenses on their own open trip. Nothing else.
-- ---------------------------------------------------------------------------

create policy trip_expenses_driver_select on public.trip_expenses for select to authenticated
  using (private.is_driver_on_open_trip(trip_id));

create policy trip_expenses_driver_insert on public.trip_expenses for insert to authenticated
  with check (
    private.is_driver_on_open_trip(trip_id)
    and entered_by_user_id = (select auth.uid())
  );

-- The driver's only window onto trips. Deliberately no freight, advance, party or profit.
create function public.driver_open_trips()
returns table (
  trip_id          uuid,
  vehicle_reg      text,
  vehicle_nickname text,
  from_place       text,
  to_place         text,
  goods            text,
  started_on       date
)
language sql stable security definer set search_path = '' as $$
  select t.id, v.reg_number, v.nickname, t.from_place, t.to_place, t.goods, t.started_on
  from public.trips t
  join public.vehicles v on v.id = t.vehicle_id
  where t.status = 'open'
    and t.driver_id in (select private.current_driver_ids())
  order by t.started_on desc
$$;

revoke execute on function public.driver_open_trips() from public, anon;
grant execute on function public.driver_open_trips() to authenticated;
