ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS is_dj boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.chat_messages.is_dj IS 'True when sender is Supabase admin (app_metadata.role) or legacy admin cookie';

UPDATE public.chat_messages SET is_dj = true WHERE sender_role = 'host';

NOTIFY pgrst, 'reload schema';
