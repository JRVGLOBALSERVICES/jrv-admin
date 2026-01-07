-- Create marketing_assets table
create table public.marketing_assets (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  type text not null check (type in ('image', 'video', 'copy', 'campaign')),
  content text, -- For text copy or JSON string for complex data
  url text, -- For Cloudinary URLs
  prompt text, -- The user prompt used to generate this
  context jsonb, -- Snapshot of data used for generation (e.g. car stats)
  metadata jsonb default '{}'::jsonb -- Extra meta (e.g. width, height, provider)
);

-- Enable RLS
alter table public.marketing_assets enable row level security;

-- Policies (Adjust based on your auth model, assuming authenticated admins)
create policy "Allow all access to admins"
on public.marketing_assets
for all
to authenticated
using (true)
with check (true);
