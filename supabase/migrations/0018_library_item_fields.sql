-- Library consolidation follow-up: the Add Item dialog collects a category and
-- a source, but the instruments table never had columns for them, so both were
-- silently dropped on insert. Persist them properly.
--
-- instrument_type is kept (nullable, unused by new code) so deploys running the
-- previous code keep working while this migration is live; drop it in a later
-- migration once no deploy writes it.

alter table instruments
  add column if not exists category text not null default 'instruments_presets',
  add column if not exists source   text not null default 'Ableton';

alter table instruments
  drop constraint if exists instruments_category_check;
alter table instruments
  add constraint instruments_category_check
  check (category in ('drums', 'instruments_presets', 'fx_racks'));

-- Backfill source from the legacy instrument_type column.
update instruments
  set source = instrument_type
  where instrument_type is not null and instrument_type <> '';
