create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  caption text not null,
  category text not null check (category in ('Final Ad', 'BTS', 'Short Film', 'Other')),
  cover_image_url text,
  mux_upload_id text unique,
  mux_asset_id text,
  mux_playback_id text,
  status text not null default 'uploading',
  published boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists projects_published_created_at_idx on public.projects (published, created_at desc);

alter table public.projects enable row level security;

drop policy if exists "Anyone can view published projects" on public.projects;
create policy "Anyone can view published projects"
  on public.projects for select
  using (published = true and mux_playback_id is not null);

drop policy if exists "Authenticated users can create projects" on public.projects;
create policy "Authenticated users can create projects"
  on public.projects for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists "Owners can update projects" on public.projects;
create policy "Owners can update projects"
  on public.projects for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
