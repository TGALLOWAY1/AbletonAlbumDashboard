-- Finish Five: add the "Live Performance" resources category.
--
-- 0011 pinned category_id to six ids with an inline (auto-named) check. The
-- Resources gallery now also offers Live Performance — Push 3 and DJing with
-- Live — so widen the constraint. Named explicitly this time so the app can
-- recognise the violation and tell the user to run this file (see
-- RESOURCES_CATEGORY_CONSTRAINT in src/lib/migration-errors.ts).

alter table resources
  drop constraint if exists resources_category_id_check;

alter table resources
  add constraint resources_category_id_check check (category_id in (
    'production-guides',
    'sound-design',
    'mixing-mastering',
    'live-performance',
    'workflow-mindset',
    'tools-plugins',
    'file-organization'
  ));
