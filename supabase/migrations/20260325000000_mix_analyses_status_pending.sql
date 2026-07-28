-- Align mix_analyses.status with API: pending | processing | completed | failed | cancelled

alter table public.mix_analyses drop constraint if exists mix_analyses_status_check;

update public.mix_analyses set status = 'pending' where status = 'queued';

alter table public.mix_analyses
  add constraint mix_analyses_status_check
  check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled'));

alter table public.mix_analyses alter column status set default 'pending';

notify pgrst, 'reload schema';
