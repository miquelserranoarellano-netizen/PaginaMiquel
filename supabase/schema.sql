-- HomeDesign Studio · tabla de proyectos en Supabase
-- Ejecuta este script una vez en tu proyecto de Supabase (SQL Editor → New query → Run).
-- Cada usuario solo puede ver y modificar sus propios proyectos (Row Level Security).

create table if not exists public.projects (
  id          text not null,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  meta        jsonb not null default '{}'::jsonb,
  doc         jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists projects_user_updated_idx on public.projects (user_id, updated_at desc);

alter table public.projects enable row level security;

drop policy if exists "Ver mis proyectos" on public.projects;
drop policy if exists "Crear mis proyectos" on public.projects;
drop policy if exists "Editar mis proyectos" on public.projects;
drop policy if exists "Borrar mis proyectos" on public.projects;

create policy "Ver mis proyectos" on public.projects
  for select to authenticated using (auth.uid() = user_id);

create policy "Crear mis proyectos" on public.projects
  for insert to authenticated with check (auth.uid() = user_id);

create policy "Editar mis proyectos" on public.projects
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Borrar mis proyectos" on public.projects
  for delete to authenticated using (auth.uid() = user_id);
