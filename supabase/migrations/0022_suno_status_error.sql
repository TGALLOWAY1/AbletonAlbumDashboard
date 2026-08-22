-- tracks.suno_status gains a third state: 'error'.
--
-- 0021 shipped the marker as a plain todo/done toggle. In practice "I haven't
-- taken this track through Suno yet" and "I tried and it came back broken" are
-- different planning facts — the second is a track to revisit, not one to
-- start — and collapsing them into 'todo' lost that every time.
--
-- Widening a check constraint only: no existing row changes meaning, and
-- 'error' is unreachable until the app writes it.

alter table tracks drop constraint if exists tracks_suno_status_check;
alter table tracks add constraint tracks_suno_status_check
  check (suno_status in ('todo', 'done', 'error'));
