-- Phase 3: the party ledger.
--
-- One row per thing that moved a party's balance, oldest first, with the running balance
-- computed here. Its last row always equals party_outstanding.outstanding: both count the
-- opening balance, freight and advance on closed trips only, and every payment.

create view public.party_ledger with (security_invoker = true) as
with entries as (
  select
    p.id                        as party_id,
    p.owner_id,
    'opening'::text             as kind,
    p.id                        as ref_id,
    null::uuid                  as trip_client_uuid,
    p.created_at::date          as entry_date,
    p.created_at,
    null::text                  as from_place,
    null::text                  as to_place,
    null::public.payment_mode   as mode,
    null::text                  as reference,
    p.opening_balance::numeric  as debit,
    0::numeric                  as credit
  from public.parties p
  where p.opening_balance <> 0

  union all
  select t.party_id, t.owner_id, 'trip', t.id, t.client_uuid, t.ended_on, t.created_at,
         t.from_place, t.to_place, null, null, t.freight_amount::numeric, 0
  from public.trips t
  where t.status = 'closed'

  union all
  select t.party_id, t.owner_id, 'advance', t.id, t.client_uuid, t.ended_on, t.created_at,
         t.from_place, t.to_place, null, null, 0, t.advance_from_party::numeric
  from public.trips t
  where t.status = 'closed' and t.advance_from_party > 0

  union all
  select x.party_id, x.owner_id, 'payment', x.id, null, x.received_on, x.created_at,
         null, null, x.mode, x.reference, 0, x.amount::numeric
  from public.payments x
)
select
  e.*,
  sum(e.debit - e.credit) over (
    partition by e.party_id
    order by (e.kind <> 'opening'), e.entry_date, e.created_at,
             case e.kind when 'trip' then 1 when 'advance' then 2 else 3 end, e.ref_id
    rows between unbounded preceding and current row
  ) as balance,
  row_number() over (
    partition by e.party_id
    order by (e.kind <> 'opening'), e.entry_date, e.created_at,
             case e.kind when 'trip' then 1 when 'advance' then 2 else 3 end, e.ref_id
  ) as seq
from entries e;

revoke all on public.party_ledger from anon;
grant select on public.party_ledger to authenticated;
revoke insert, update, delete, truncate, references, trigger on public.party_ledger from authenticated;
