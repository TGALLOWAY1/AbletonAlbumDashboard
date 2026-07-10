-- Lets the user pin a single track as their current "focus" from the dashboard.
alter table tracks add column if not exists is_focus boolean not null default false;

-- At most one focused track per owner.
create unique index if not exists tracks_one_focus_per_owner on tracks (owner_id) where is_focus;
