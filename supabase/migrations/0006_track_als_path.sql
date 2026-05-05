-- Finish Five: link to the Ableton .als project file on the producer's machine.
-- Stored as a free-form path string; the UI exposes a "copy path" button.

alter table tracks add column if not exists als_file_path text;
