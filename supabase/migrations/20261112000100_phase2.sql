-- Phase 2: trip loop + offline sync + photos.

-- ---------------------------------------------------------------------------
-- Photos: private buckets, one folder per owner (<owner uid>/...). Bunk slips and vehicle
-- documents are only ever readable by the owner who uploaded them.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('slips', 'slips', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('vehicle-docs', 'vehicle-docs', false, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy photos_owner_select on storage.objects for select to authenticated
  using (bucket_id in ('slips', 'vehicle-docs') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('slips', 'vehicle-docs') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_owner_update on storage.objects for update to authenticated
  using (bucket_id in ('slips', 'vehicle-docs') and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id in ('slips', 'vehicle-docs') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id in ('slips', 'vehicle-docs') and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- trip_summary gains the phone-minted client_uuid (trip URLs use it, so a trip created
-- offline has the same address before and after sync) and the names lists need.
-- Existing columns keep their order; new ones are appended.
-- ---------------------------------------------------------------------------
create or replace view public.trip_summary with (security_invoker = true) as
select
  t.id                                    as trip_id,
  t.owner_id,
  t.vehicle_id,
  t.driver_id,
  t.party_id,
  t.status,
  t.started_on,
  t.ended_on,
  t.from_place,
  t.to_place,
  t.freight_amount,
  t.advance_from_party,
  coalesce(e.diesel_amount, 0)            as diesel_amount,
  coalesce(e.toll_amount, 0)              as toll_amount,
  coalesce(e.bata_amount, 0)              as bata_amount,
  coalesce(e.repair_amount, 0)            as repair_amount,
  coalesce(e.fine_amount, 0)              as fine_amount,
  coalesce(e.other_amount, 0)             as other_amount,
  coalesce(e.expense_total, 0)            as expense_total,
  t.freight_amount - coalesce(e.expense_total, 0) as profit,
  t.start_odometer,
  t.end_odometer,
  t.end_odometer - t.start_odometer       as distance_km,
  coalesce(e.litres, 0)                   as litres,
  round((t.end_odometer - t.start_odometer)::numeric / nullif(e.litres, 0), 2) as mileage_kmpl,
  t.client_uuid,
  v.reg_number                            as vehicle_reg,
  v.nickname                              as vehicle_nickname,
  p.name                                  as party_name,
  d.name                                  as driver_name,
  t.goods,
  coalesce(e.expense_count, 0)            as expense_count,
  t.created_at
from public.trips t
join public.vehicles v on v.id = t.vehicle_id
join public.parties p on p.id = t.party_id
left join public.drivers d on d.id = t.driver_id
left join lateral (
  select
    sum(x.amount) filter (where x.kind = 'diesel') as diesel_amount,
    sum(x.amount) filter (where x.kind = 'toll')   as toll_amount,
    sum(x.amount) filter (where x.kind = 'bata')   as bata_amount,
    sum(x.amount) filter (where x.kind = 'repair') as repair_amount,
    sum(x.amount) filter (where x.kind = 'fine')   as fine_amount,
    sum(x.amount) filter (where x.kind = 'other')  as other_amount,
    sum(x.amount)                                  as expense_total,
    sum(x.litres)                                  as litres,
    count(*)                                       as expense_count
  from public.trip_expenses x
  where x.trip_id = t.id
) e on true;

-- The last odometer reading we know for each vehicle: a new trip starts from here, and the
-- diesel screen offers it as the floor for the next reading.
create view public.vehicle_odometer with (security_invoker = true) as
select
  v.id as vehicle_id,
  v.owner_id,
  greatest(
    (select max(t.end_odometer) from public.trips t where t.vehicle_id = v.id and t.status = 'closed'),
    (select max(t.start_odometer) from public.trips t where t.vehicle_id = v.id and t.status <> 'cancelled'),
    (select max(x.odometer) from public.trip_expenses x join public.trips t on t.id = x.trip_id
      where t.vehicle_id = v.id and t.status <> 'cancelled')
  ) as last_odometer
from public.vehicles v;

revoke all on public.vehicle_odometer from anon;
grant select on public.vehicle_odometer to authenticated;
revoke insert, update, delete, truncate, references, trigger on public.vehicle_odometer from authenticated;
