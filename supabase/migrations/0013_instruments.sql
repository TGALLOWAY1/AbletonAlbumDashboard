-- Finish Five: instruments library.
-- Stores user-curated Ableton instruments/devices (Slicer, Drum Rack, Sampler,
-- Instrument Rack, and custom racks). Shown under the Library "Instruments" tab.

create table instruments (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null,
  name            text not null,
  -- device or custom value (e.g. "Drum Rack", "808 → Growl Rack"); nullable
  instrument_type text,
  notes           text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index instruments_owner_created_idx
  on instruments (owner_id, created_at desc);

create trigger instruments_set_updated_at
  before update on instruments
  for each row execute function set_updated_at();
