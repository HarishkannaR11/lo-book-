-- Phase 1 schema: masters and transactions, all scoped to one owner.
--
-- Cross-owner references are impossible by construction: every child row points at its
-- parent through a composite (id, owner_id) foreign key, so an owner cannot attach a trip
-- to someone else's vehicle, driver or party even if they guess the uuid.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create type public.app_locale   as enum ('ta', 'en');
create type public.doc_type     as enum ('fc', 'insurance', 'permit', 'pollution', 'national_permit');
create type public.trip_status  as enum ('open', 'closed', 'cancelled');
create type public.expense_kind as enum ('diesel', 'toll', 'bata', 'repair', 'fine', 'other');
create type public.payment_mode as enum ('upi', 'cash', 'cheque', 'bank');

-- Indian mobile numbers are stored the way Supabase Auth stores auth.users.phone:
-- country code, no plus sign. 919876543210.
create domain public.in_mobile as text check (value ~ '^91[6-9][0-9]{9}$');
create domain public.money as numeric(12, 2) check (value >= 0 and value < 1000000000);

create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Masters
-- ---------------------------------------------------------------------------

create table public.owners (
  id            uuid primary key references auth.users (id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 80),
  business_name text not null check (char_length(btrim(business_name)) between 1 and 120),
  phone         public.in_mobile not null,
  locale        public.app_locale not null default 'ta',
  created_at    timestamptz not null default now()
);

-- The owner's phone always comes from the verified auth identity, never from the client.
create function private.owners_take_phone_from_auth() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select u.phone into new.phone from auth.users u where u.id = new.id;
  if new.phone is null then
    raise exception 'owner % has no verified phone', new.id using errcode = '23514';
  end if;
  return new;
end $$;

create trigger owners_take_phone_from_auth
  before insert or update of phone on public.owners
  for each row execute function private.owners_take_phone_from_auth();

create table public.vehicles (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references public.owners (id) on delete cascade,
  reg_number text not null check (reg_number ~ '^[A-Z0-9]{4,12}$'),
  nickname   text check (nickname is null or char_length(nickname) <= 40),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (owner_id, reg_number),
  unique (id, owner_id)
);

create table public.vehicle_documents (
  id         uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  doc_type   public.doc_type not null,
  expires_on date not null,
  file_url   text,
  created_at timestamptz not null default now(),
  unique (vehicle_id, doc_type)
);

create table public.drivers (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references public.owners (id) on delete cascade,
  name           text not null check (char_length(btrim(name)) between 1 and 80),
  phone          public.in_mobile not null,
  licence_number text check (licence_number is null or char_length(licence_number) <= 30),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  unique (owner_id, phone),
  unique (id, owner_id)
);
create index drivers_phone_idx on public.drivers (phone);

create table public.parties (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references public.owners (id) on delete cascade,
  name            text not null check (char_length(btrim(name)) between 1 and 120),
  phone           public.in_mobile,
  place           text check (place is null or char_length(place) <= 80),
  opening_balance numeric(12, 2) not null default 0,
  created_at      timestamptz not null default now(),
  unique (id, owner_id)
);
create index parties_owner_idx on public.parties (owner_id);

-- ---------------------------------------------------------------------------
-- Transactions. Each carries client_uuid, minted on the phone, for idempotent sync.
-- ---------------------------------------------------------------------------

create table public.trips (
  id                 uuid primary key default gen_random_uuid(),
  client_uuid        uuid not null unique,
  owner_id           uuid not null default auth.uid() references public.owners (id) on delete cascade,
  vehicle_id         uuid not null,
  driver_id          uuid,
  party_id           uuid not null,
  from_place         text not null check (char_length(btrim(from_place)) between 1 and 80),
  to_place           text not null check (char_length(btrim(to_place)) between 1 and 80),
  goods              text check (goods is null or char_length(goods) <= 80),
  freight_amount     public.money not null,
  advance_from_party public.money not null default 0,
  start_odometer     integer check (start_odometer >= 0),
  end_odometer       integer check (end_odometer >= 0),
  started_on         date not null default (now() at time zone 'Asia/Kolkata')::date,
  ended_on           date,
  status             public.trip_status not null default 'open',
  notes              text check (notes is null or char_length(notes) <= 500),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  foreign key (vehicle_id, owner_id) references public.vehicles (id, owner_id),
  foreign key (driver_id, owner_id)  references public.drivers (id, owner_id),
  foreign key (party_id, owner_id)   references public.parties (id, owner_id),
  unique (id, owner_id, party_id),

  constraint odometer_forward check (end_odometer is null or start_odometer is null or end_odometer >= start_odometer),
  constraint ended_after_start check (ended_on is null or ended_on >= started_on),
  constraint closed_needs_end check (status <> 'closed' or (end_odometer is not null and ended_on is not null))
);
create index trips_owner_status_idx on public.trips (owner_id, status, ended_on);
create index trips_vehicle_idx on public.trips (vehicle_id);
create index trips_party_idx on public.trips (party_id);
create index trips_driver_idx on public.trips (driver_id) where status = 'open';
create trigger trips_updated_at before update on public.trips
  for each row execute function private.set_updated_at();

create table public.trip_expenses (
  id                 uuid primary key default gen_random_uuid(),
  client_uuid        uuid not null unique,
  trip_id            uuid not null references public.trips (id) on delete cascade,
  kind               public.expense_kind not null,
  amount             public.money not null,
  litres             numeric(8, 2) check (litres > 0),
  odometer           integer check (odometer >= 0),
  spent_on           date not null default (now() at time zone 'Asia/Kolkata')::date,
  entered_by_user_id uuid default auth.uid() references auth.users (id) on delete set null,
  photo_url          text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- Diesel always has litres (mileage depends on it); nothing else ever does.
  constraint litres_iff_diesel check ((kind = 'diesel') = (litres is not null))
);
create index trip_expenses_trip_idx on public.trip_expenses (trip_id);
create trigger trip_expenses_updated_at before update on public.trip_expenses
  for each row execute function private.set_updated_at();

create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  client_uuid uuid not null unique,
  owner_id    uuid not null default auth.uid() references public.owners (id) on delete cascade,
  party_id    uuid not null,
  trip_id     uuid,
  amount      public.money not null check (amount > 0),
  mode        public.payment_mode not null,
  received_on date not null default (now() at time zone 'Asia/Kolkata')::date,
  reference   text check (reference is null or char_length(reference) <= 80),
  created_at  timestamptz not null default now(),
  foreign key (party_id, owner_id) references public.parties (id, owner_id),
  -- A payment tied to a trip must be from that trip's party (skipped when trip_id is null).
  foreign key (trip_id, owner_id, party_id) references public.trips (id, owner_id, party_id)
);
create index payments_party_idx on public.payments (party_id);
