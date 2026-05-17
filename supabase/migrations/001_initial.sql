create extension if not exists "pgcrypto";

create table friends_family (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  relation     text,         -- e.g. "grandson", "daughter"
  llm_summary  text,         -- populated later
  created_at   timestamptz not null default now()
);

create table memories (
  id                    uuid primary key default gen_random_uuid(),
  image_url             text not null,
  image_width           integer not null,
  image_height          integer not null,
  answer_who_is_this    text,   -- "Who's this — and who are they to Johnny?"
  answer_whats_going_on text,   -- "What's going on in this photo?"
  answer_recognize      text,   -- "What would Johnny recognize about them?"
  answer_upset          text,   -- "Anything here that might upset Johnny?"
  created_at            timestamptz not null default now()
);

create table memory_people (
  id               uuid primary key default gen_random_uuid(),
  memory_id        uuid not null references memories(id) on delete cascade,
  friend_family_id uuid references friends_family(id) on delete set null,
  name             text,     -- denormalised for quick access
  bbox_x           real not null,
  bbox_y           real not null,
  bbox_w           real not null,
  bbox_h           real not null,
  detection_score  real,     -- 1.0 for manually drawn boxes
  created_at       timestamptz not null default now()
);
