-- Phase 4: insight. Every number here is derived in SQL, never on the phone.

-- ---------------------------------------------------------------------------
-- Per-trip mileage against the vehicle's own usual.
-- "Usual" = the median km/L of the vehicle's previous 10 closed trips. A median, not an
-- average, so one or two bad trips don't drag the baseline down: a lorry that drops 10% and
-- stays there keeps showing red trip after trip, until the low level is most of its last 10
-- trips (by then it is the new normal). Compared only against itself, never other lorries.
-- Fewer than 3 earlier trips → no usual yet, no judgement.
-- ---------------------------------------------------------------------------
create view public.vehicle_trip_mileage with (security_invoker = true) as
with closed as (
  select s.owner_id, s.vehicle_id, s.trip_id, s.client_uuid, s.ended_on, s.created_at,
         s.from_place, s.to_place, s.distance_km, s.litres, s.mileage_kmpl
  from public.trip_summary s
  where s.status = 'closed' and s.distance_km > 0 and s.litres > 0
),
judged as (
  select c.*, b.usual, b.prior_trips,
         row_number() over (partition by c.vehicle_id order by c.ended_on desc, c.created_at desc, c.trip_id desc) as recency
  from closed c
  left join lateral (
    select percentile_cont(0.5) within group (order by p.mileage_kmpl)::numeric as usual,
           count(*) as prior_trips
    from (
      select c2.mileage_kmpl
      from closed c2
      where c2.vehicle_id = c.vehicle_id
        and (c2.ended_on, c2.created_at, c2.trip_id) < (c.ended_on, c.created_at, c.trip_id)
      order by c2.ended_on desc, c2.created_at desc, c2.trip_id desc
      limit 10
    ) p
  ) b on true
)
select
  j.owner_id, j.vehicle_id, j.trip_id, j.client_uuid, j.ended_on, j.from_place, j.to_place,
  j.distance_km, j.litres, j.mileage_kmpl, j.recency,
  case when j.prior_trips >= 3 then round(j.usual, 2) end                                as usual_kmpl,
  case when j.prior_trips >= 3 then round((j.mileage_kmpl / j.usual - 1) * 100, 1) end   as vs_usual_pct,
  coalesce(j.prior_trips >= 3 and j.mileage_kmpl <= j.usual * 0.9, false)                as is_drop
from judged j;

-- ---------------------------------------------------------------------------
-- Monthly report: one row per vehicle per month, plus one all-vehicles row (is_total).
-- Closed trips only, by the month they ended — the same rule as the home screen's profit.
-- ---------------------------------------------------------------------------
create view public.monthly_report with (security_invoker = true) as
select
  s.owner_id,
  date_trunc('month', s.ended_on)::date as month,
  s.vehicle_id,
  grouping(s.vehicle_id) = 1           as is_total,
  count(*)                             as trips,
  sum(s.freight_amount)                as revenue,
  sum(s.expense_total)                 as expenses,
  sum(s.profit)                        as profit,
  sum(s.distance_km)                   as distance_km,
  sum(s.litres)                        as litres,
  round(
    sum(s.distance_km) filter (where s.distance_km > 0 and s.litres > 0)
    / nullif(sum(s.litres) filter (where s.distance_km > 0 and s.litres > 0), 0), 2
  )                                    as mileage_kmpl
from public.trip_summary s
where s.status = 'closed'
group by grouping sets (
  (s.owner_id, date_trunc('month', s.ended_on), s.vehicle_id),
  (s.owner_id, date_trunc('month', s.ended_on))
);

-- ---------------------------------------------------------------------------
-- Documents that have expired or expire within 30 days (India date), for the home screen.
-- ---------------------------------------------------------------------------
create view public.document_alerts with (security_invoker = true) as
select
  v.owner_id,
  d.vehicle_id,
  v.reg_number,
  d.doc_type,
  d.expires_on,
  d.expires_on - (now() at time zone 'Asia/Kolkata')::date as days_left
from public.vehicle_documents d
join public.vehicles v on v.id = d.vehicle_id
where v.is_active
  and d.expires_on - (now() at time zone 'Asia/Kolkata')::date <= 30;

revoke all on public.vehicle_trip_mileage, public.monthly_report, public.document_alerts from anon;
grant select on public.vehicle_trip_mileage, public.monthly_report, public.document_alerts to authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.vehicle_trip_mileage, public.monthly_report, public.document_alerts from authenticated;
