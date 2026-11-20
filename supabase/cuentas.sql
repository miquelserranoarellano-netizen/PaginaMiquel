-- HomeDesign Studio · cuentas (usuario y contraseña) y casas guardadas desde la web.
-- Ejecuta este script UNA vez en tu proyecto de Supabase: SQL Editor → New query → pegar → Run.
--
-- Solo el servidor de la web (Cloudflare Worker) accede a estas tablas, con la
-- clave secreta de Supabase. Row Level Security está activado y sin políticas,
-- así que la clave pública (anon) no puede leer ni escribir nada.

create table if not exists public.hd_users (
  id          text primary key,            -- usuario en minúsculas
  username    text not null,               -- usuario tal y como se escribió
  password    text not null,               -- hash PBKDF2 (nunca la contraseña en claro)
  created_at  bigint not null
);

create table if not exists public.hd_sessions (
  token_hash  text primary key,            -- hash del token de sesión
  user_id     text not null references public.hd_users (id) on delete cascade,
  expires_at  bigint not null
);
create index if not exists hd_sessions_user_idx on public.hd_sessions (user_id);

create table if not exists public.hd_login_attempts (
  user_id       text primary key,
  fails         integer not null,
  locked_until  bigint not null
);

create table if not exists public.hd_projects (
  user_id     text not null references public.hd_users (id) on delete cascade,
  id          text not null,
  name        text not null default '',    -- nombre de la casa (para verlo en el Table Editor)
  meta        jsonb not null,              -- ficha: nombre, miniatura, superficie…
  version     bigint not null,
  parts       jsonb not null,              -- proyecto comprimido (zlib + base64), en trozos
  size        integer not null,
  updated_at  bigint not null,
  primary key (user_id, id)
);
create index if not exists hd_projects_user_updated_idx on public.hd_projects (user_id, updated_at desc);

alter table public.hd_users enable row level security;
alter table public.hd_sessions enable row level security;
alter table public.hd_login_attempts enable row level security;
alter table public.hd_projects enable row level security;

revoke all on public.hd_users, public.hd_sessions, public.hd_login_attempts, public.hd_projects from anon, authenticated;
