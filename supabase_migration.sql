-- ─────────────────────────────────────────────────────────────
--  ReadSmart — Supabase schema migration
--  Run this in your Supabase SQL editor (project: ptvfbmuqgefncwkzrvxt)
--  All tables prefixed with rs_ to avoid conflicts with existing tables
-- ─────────────────────────────────────────────────────────────

-- ─── Learner profiles ─────────────────────────────────────────
create table if not exists rs_learner_profiles (
  id                  uuid primary key default gen_random_uuid(),
  tutor_id            uuid references auth.users(id) on delete cascade not null,
  full_name           text not null,
  date_of_birth       date,
  current_stage       smallint not null default 1 check (current_stage between 1 and 6),
  language_primary    text default 'English',
  eal_flag            boolean default false,
  programme_notes     text,
  entry_date          date default current_date,
  dyslexia_flag_level text default 'none' check (dyslexia_flag_level in ('none','monitor','moderate','urgent')),
  ot_referral_status  text default 'none' check (ot_referral_status in ('none','pending','in_progress','complete')),
  parent_user_id      uuid references auth.users(id),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  deleted_at          timestamptz
);

-- ─── Sessions ──────────────────────────────────────────────────
create table if not exists rs_sessions (
  id                  uuid primary key default gen_random_uuid(),
  learner_id          uuid references rs_learner_profiles(id) on delete cascade not null,
  tutor_id            uuid references auth.users(id) not null,
  stage               smallint not null,
  session_date        date not null default current_date,
  session_type        text not null default 'teaching'
                        check (session_type in ('teaching','review','assessment','gate','flag')),
  duration_minutes    smallint,
  rating              text check (rating in ('great','good','mixed','difficult')),
  notes               text,
  activities_completed jsonb default '[]',
  ot_flags_raised     boolean default false,
  synced_at           timestamptz default now(),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ─── Gate assessments ──────────────────────────────────────────
create table if not exists rs_gate_assessments (
  id                      uuid primary key default gen_random_uuid(),
  learner_id              uuid references rs_learner_profiles(id) on delete cascade not null,
  tutor_id                uuid references auth.users(id) not null,
  gate_number             smallint not null check (gate_number between 1 and 6),
  assessment_date         date not null default current_date,
  scores                  jsonb not null default '{}',
  primary_criterion_met   boolean,
  verdict                 text check (verdict in ('pass','hold','remediate')),
  remediation_plan        text,
  regate_date             date,
  signed_off_by           uuid references auth.users(id),
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- ─── Fluency records ───────────────────────────────────────────
create table if not exists rs_fluency_records (
  id                  uuid primary key default gen_random_uuid(),
  learner_id          uuid references rs_learner_profiles(id) on delete cascade not null,
  session_id          uuid references rs_sessions(id),
  reading_date        date not null default current_date,
  wcpm                smallint not null,
  accuracy_pct        numeric(5,2),
  read_number         smallint default 1 check (read_number between 0 and 3),
  mfs_expression      smallint check (mfs_expression between 1 and 4),
  mfs_phrasing        smallint check (mfs_phrasing between 1 and 4),
  mfs_pace            smallint check (mfs_pace between 1 and 4),
  mfs_punctuation     smallint check (mfs_punctuation between 1 and 4),
  passage_title       text,
  notes               text,
  created_at          timestamptz default now()
);

-- ─── OT flags ──────────────────────────────────────────────────
create table if not exists rs_ot_flags (
  id              uuid primary key default gen_random_uuid(),
  learner_id      uuid references rs_learner_profiles(id) on delete cascade not null,
  raised_by       uuid references auth.users(id) not null,
  flag_type       text not null check (flag_type in ('urgent','moderate','monitor')),
  flag_category   text not null,
  description     text not null,
  actioned        boolean default false,
  action_taken    text,
  session_id      uuid references rs_sessions(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─── Updated_at triggers ───────────────────────────────────────
create or replace function rs_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger rs_learner_profiles_updated_at before update on rs_learner_profiles
  for each row execute function rs_set_updated_at();
create trigger rs_sessions_updated_at before update on rs_sessions
  for each row execute function rs_set_updated_at();
create trigger rs_gate_assessments_updated_at before update on rs_gate_assessments
  for each row execute function rs_set_updated_at();
create trigger rs_ot_flags_updated_at before update on rs_ot_flags
  for each row execute function rs_set_updated_at();

-- ─── Row Level Security ────────────────────────────────────────
alter table rs_learner_profiles enable row level security;
alter table rs_sessions enable row level security;
alter table rs_gate_assessments enable row level security;
alter table rs_fluency_records enable row level security;
alter table rs_ot_flags enable row level security;

-- Tutors can only see their own learners
create policy "Tutors see own learners"
  on rs_learner_profiles for all
  using (tutor_id = auth.uid());

-- Tutors can only see sessions for their learners
create policy "Tutors see own sessions"
  on rs_sessions for all
  using (tutor_id = auth.uid());

-- Tutors can only see gate assessments for their learners
create policy "Tutors see own gate assessments"
  on rs_gate_assessments for all
  using (tutor_id = auth.uid());

-- Tutors see fluency records for their learners
create policy "Tutors see own fluency records"
  on rs_fluency_records for all
  using (
    learner_id in (
      select id from rs_learner_profiles where tutor_id = auth.uid()
    )
  );

-- Tutors see OT flags they raised or for their learners
create policy "Tutors see own flags"
  on rs_ot_flags for all
  using (raised_by = auth.uid());

-- ─── Indexes ───────────────────────────────────────────────────
create index if not exists rs_learner_profiles_tutor_idx on rs_learner_profiles(tutor_id);
create index if not exists rs_sessions_learner_idx on rs_sessions(learner_id);
create index if not exists rs_sessions_date_idx on rs_sessions(session_date desc);
create index if not exists rs_ot_flags_learner_idx on rs_ot_flags(learner_id);
create index if not exists rs_fluency_records_learner_idx on rs_fluency_records(learner_id);
