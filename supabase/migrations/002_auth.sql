-- Patients owned by a caregiver (references auth.users)
create table patients (
  id              uuid primary key default gen_random_uuid(),
  caregiver_id    uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  notes           text,
  experience_mode text not null default 'self_paced'
    check (experience_mode in ('self_paced', 'caregiver_guided')),
  created_at      timestamptz not null default now()
);

-- Contributors invited to a patient's life story
create table patient_contributors (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references patients(id) on delete cascade,
  contributor_id uuid references auth.users(id) on delete set null,
  email          text not null,
  invited_at     timestamptz not null default now(),
  unique(patient_id, email)
);

-- Scope existing tables to a patient
alter table memories       add column patient_id uuid references patients(id) on delete cascade;
alter table friends_family add column patient_id uuid references patients(id) on delete cascade;
