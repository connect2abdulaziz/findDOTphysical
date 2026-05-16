-- ─── Run this in Supabase → SQL Editor ──────────────────────────────────────
-- Creates the examiners table with all required columns per the SOW spec.

create extension if not exists "pgcrypto";

create table if not exists public.examiners (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  clinic_type           text,
  city                  text,
  state                 text default 'OK',
  address               text,
  phone                 text,
  email                 text,
  price                 text,
  wait_time             text,
  hours                 text,
  badges                text[]  default '{}',
  accepts               text[]  default '{}',
  rating                numeric(3, 1),
  review_count          integer default 0,
  tier                  text    default 'free' check (tier in ('free', 'featured', 'premium')),
  verified              boolean default false,
  active                boolean default true,
  stripe_subscription_id text,          -- stores sub ID for cancellation webhook
  created_at            timestamptz default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table public.examiners enable row level security;

-- Public can read active listings
create policy "Public read active examiners"
  on public.examiners for select
  using (active = true);

-- Only service role (server-side) can insert/update/delete.
-- The admin panel uses /api/admin-examiners (Vercel) with SUPABASE_SERVICE_ROLE_KEY.
-- Do NOT add public UPDATE policies on the anon key — that would let anyone edit listings.

-- ─── Sample Data — 5 seed rows ────────────────────────────────────────────────
insert into public.examiners
  (name, clinic_type, city, address, phone, price, wait_time, hours, badges, accepts, rating, review_count, tier, verified, active)
values
  (
    'OKC Occupational Health Center',
    'Occupational Health',
    'Oklahoma City',
    '1234 N Lincoln Blvd, Oklahoma City, OK 73104',
    '4055550001',
    '$75',
    'Same day',
    'Mon–Fri 7am–6pm',
    ARRAY['Walk-ins Welcome', 'FMCSA Certified'],
    ARRAY['All CDL Classes', 'Hazmat'],
    4.8, 142, 'premium', true, true
  ),
  (
    'Tulsa DOT Medical Clinic',
    'Urgent Care',
    'Tulsa',
    '5678 S Peoria Ave, Tulsa, OK 74105',
    '9185550002',
    '$85',
    'Next day',
    'Mon–Sat 8am–5pm',
    ARRAY['Open Weekends', 'FMCSA Certified'],
    ARRAY['All CDL Classes'],
    4.6, 89, 'featured', true, true
  ),
  (
    'Norman CDL Physical Center',
    'Chiropractic',
    'Norman',
    '900 W Main St, Norman, OK 73069',
    '4055550003',
    '$70',
    'Same day',
    'Mon–Fri 8am–4pm',
    ARRAY['Walk-ins Welcome'],
    ARRAY['All CDL Classes', 'School Bus'],
    4.5, 57, 'free', true, true
  ),
  (
    'Lawton Truck Driver Health',
    'Occupational Health',
    'Lawton',
    '300 SW C Ave, Lawton, OK 73501',
    '5805550004',
    '$80',
    'Same day',
    'Mon–Fri 7am–5pm',
    ARRAY['FMCSA Certified', 'Walk-ins Welcome'],
    ARRAY['All CDL Classes', 'Hazmat'],
    4.7, 33, 'free', false, true
  ),
  (
    'Edmond Express DOT Exams',
    'Urgent Care',
    'Edmond',
    '1500 S Broadway, Edmond, OK 73034',
    '4055550005',
    '$85–$100',
    'Same day',
    'Mon–Sun 8am–8pm',
    ARRAY['Open Weekends', 'Walk-ins Welcome', 'FMCSA Certified'],
    ARRAY['All CDL Classes', 'Hazmat', 'School Bus'],
    4.9, 201, 'premium', true, true
  );
