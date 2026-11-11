-- Derived numbers. Never stored, never typed, never recomputed in the client.
-- Every view is security_invoker, so it runs with the caller's RLS: a driver, who has no
-- row access to trips, gets zero rows from every one of these.

create view public.trip_summary with (security_invoker = true) as
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
  round((t.end_odometer - t.start_odometer)::numeric / nullif(e.litres, 0), 2) as mileage_kmpl
from public.trips t
left join lateral (
  select
    sum(x.amount) filter (where x.kind = 'diesel') as diesel_amount,
    sum(x.amount) filter (where x.kind = 'toll')   as toll_amount,
    sum(x.amount) filter (where x.kind = 'bata')   as bata_amount,
    sum(x.amount) filter (where x.kind = 'repair') as repair_amount,
    sum(x.amount) filter (where x.kind = 'fine')   as fine_amount,
    sum(x.amount) filter (where x.kind = 'other')  as other_amount,
    sum(x.amount)                                  as expense_total,
    sum(x.litres)                                  as litres
  from public.trip_expenses x
  where x.trip_id = t.id
) e on true;

-- Per vehicle per month (by trip end date), with the vehicle's own trailing average over
-- the six months before it.
create view public.vehicle_mileage with (security_invoker = true) as
with monthly as (
  select
    s.owner_id,
    s.vehicle_id,
    date_trunc('month', s.ended_on)::date as month,
    count(*)                              as trips,
    sum(s.distance_km)                    as distance_km,
    sum(s.litres)                         as litres
  from public.trip_summary s
  where s.status = 'closed' and s.distance_km is not null and s.litres > 0
  group by s.owner_id, s.vehicle_id, date_trunc('month', s.ended_on)
)
select
  m.owner_id,
  m.vehicle_id,
  m.month,
  m.trips,
  m.distance_km,
  m.litres,
  round(m.distance_km / m.litres, 2) as mileage_kmpl,
  round(sum(m.distance_km) over w / nullif(sum(m.litres) over w, 0), 2) as trailing_avg_kmpl
from monthly m
window w as (partition by m.vehicle_id order by m.month rows between 6 preceding and 1 preceding);

-- What each party owes: opening balance, plus net freight on closed trips (freight minus
-- the advance they paid at loading), minus payments received.
create view public.party_outstanding with (security_invoker = true) as
select
  p.id                              as party_id,
  p.owner_id,
  p.name,
  p.place,
  p.phone,
  p.opening_balance,
  coalesce(b.billed, 0)             as billed,
  coalesce(b.advance, 0)            as advance_received,
  coalesce(r.received, 0)           as payments_received,
  p.opening_balance + coalesce(b.billed, 0) - coalesce(b.advance, 0) - coalesce(r.received, 0)
                                    as outstanding
from public.parties p
left join lateral (
  select sum(t.freight_amount) as billed, sum(t.advance_from_party) as advance
  from public.trips t
  where t.party_id = p.id and t.status = 'closed'
) b on true
left join lateral (
  select sum(x.amount) as received
  from public.payments x
  where x.party_id = p.id
) r on true;

-- The two numbers on the home screen. "This month" is the calendar month in India.
create view public.owner_dashboard with (security_invoker = true) as
select
  o.id as owner_id,
  coalesce((
    select sum(s.profit)
    from public.trip_summary s
    where s.owner_id = o.id
      and s.status = 'closed'
      and s.ended_on >= date_trunc('month', now() at time zone 'Asia/Kolkata')::date
  ), 0) as month_profit,
  coalesce((
    select sum(po.outstanding)
    from public.party_outstanding po
    where po.owner_id = o.id
  ), 0) as total_outstanding
from public.owners o;

revoke all on public.trip_summary, public.vehicle_mileage, public.party_outstanding, public.owner_dashboard from anon;
grant select on public.trip_summary, public.vehicle_mileage, public.party_outstanding, public.owner_dashboard to authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.trip_summary, public.vehicle_mileage, public.party_outstanding, public.owner_dashboard
  from authenticated;
