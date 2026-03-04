-- Run this in Supabase SQL Editor after creating or changing tables.
-- Refreshes the API schema cache so the app can see the tables.
NOTIFY pgrst, 'reload schema';
