# Media Manager – Supabase Storage

To use the **Media Manager** (upload MP3/MP4), create a storage bucket in Supabase:

1. Supabase Dashboard → **Storage** → **New bucket**
2. Name: `media`
3. **Public bucket**: enable (so Stage View and players can play back files via public URL)
4. Create the bucket

Optional: add a policy to allow uploads (if using anon key). With the service role key, the app can upload without a separate policy. For public uploads you’d add something like:

- Policy name: Allow uploads  
- Allowed operation: INSERT  
- Target: bucket `media`  
- WITH CHECK: true (or restrict by auth if you add auth later)

After the bucket exists, uploads from the app go to `media/mp3/` and `media/mp4/` and are indexed in `media_library`.
