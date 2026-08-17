-- Ensure `media` bucket MIME allowlist includes common audio/video types.
-- Safe to re-run. Does not change the bucket name (must remain `media`).

update storage.buckets
set
  public = true,
  file_size_limit = coalesce(file_size_limit, 104857600),
  allowed_mime_types = array[
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/wave',
    'audio/aac',
    'audio/mp4',
    'audio/x-m4a',
    'audio/m4a',
    'video/mp4',
    'application/octet-stream'
  ]
where id = 'media';
