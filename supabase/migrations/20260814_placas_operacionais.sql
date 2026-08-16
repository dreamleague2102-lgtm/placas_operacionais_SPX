-- Banco do Painel de QR Code SPX
-- Execute esta migration pelo Supabase para persistir modelos, placas e lotes.

create extension if not exists pgcrypto;

create table if not exists public.modelos_placa (
  id text primary key,
  nome text not null,
  descricao text not null default '',
  configuracao jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.lotes_placas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  modelo_id text not null references public.modelos_placa(id),
  nome text not null default 'Novo lote',
  configuracao jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.placas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lote_id uuid references public.lotes_placas(id) on delete cascade,
  modelo_id text not null references public.modelos_placa(id),
  ordem integer not null default 0,
  nome text not null default '',
  conteudo_qr text,
  texto_superior text,
  texto_inferior text,
  familia_fonte text not null default 'Calibri',
  tamanho_fonte numeric(6,2),
  negrito boolean not null default true,
  ajuste_automatico boolean not null default true,
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.historico_impressoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  modelo_id text not null references public.modelos_placa(id),
  quantidade integer not null check (quantidade > 0),
  dados jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists lotes_placas_usuario_criado_idx
  on public.lotes_placas (usuario_id, criado_em desc);
create index if not exists placas_usuario_modelo_idx
  on public.placas (usuario_id, modelo_id);
create index if not exists placas_lote_ordem_idx
  on public.placas (lote_id, ordem);
create index if not exists historico_usuario_criado_idx
  on public.historico_impressoes (usuario_id, criado_em desc);

create or replace function public.atualizar_data_modificacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists modelos_placa_atualizado_em on public.modelos_placa;
create trigger modelos_placa_atualizado_em
before update on public.modelos_placa
for each row execute function public.atualizar_data_modificacao();

drop trigger if exists lotes_placas_atualizado_em on public.lotes_placas;
create trigger lotes_placas_atualizado_em
before update on public.lotes_placas
for each row execute function public.atualizar_data_modificacao();

drop trigger if exists placas_atualizado_em on public.placas;
create trigger placas_atualizado_em
before update on public.placas
for each row execute function public.atualizar_data_modificacao();

alter table public.modelos_placa enable row level security;
alter table public.lotes_placas enable row level security;
alter table public.placas enable row level security;
alter table public.historico_impressoes enable row level security;

drop policy if exists "Modelos podem ser consultados" on public.modelos_placa;
create policy "Modelos podem ser consultados"
on public.modelos_placa for select
to anon, authenticated
using (ativo = true);

drop policy if exists "Usuário consulta seus lotes" on public.lotes_placas;
create policy "Usuário consulta seus lotes" on public.lotes_placas
for select to authenticated using ((select auth.uid()) = usuario_id);
drop policy if exists "Usuário cria seus lotes" on public.lotes_placas;
create policy "Usuário cria seus lotes" on public.lotes_placas
for insert to authenticated with check ((select auth.uid()) = usuario_id);
drop policy if exists "Usuário altera seus lotes" on public.lotes_placas;
create policy "Usuário altera seus lotes" on public.lotes_placas
for update to authenticated
using ((select auth.uid()) = usuario_id)
with check ((select auth.uid()) = usuario_id);
drop policy if exists "Usuário remove seus lotes" on public.lotes_placas;
create policy "Usuário remove seus lotes" on public.lotes_placas
for delete to authenticated using ((select auth.uid()) = usuario_id);

drop policy if exists "Usuário consulta suas placas" on public.placas;
create policy "Usuário consulta suas placas" on public.placas
for select to authenticated using ((select auth.uid()) = usuario_id);
drop policy if exists "Usuário cria suas placas" on public.placas;
create policy "Usuário cria suas placas" on public.placas
for insert to authenticated with check ((select auth.uid()) = usuario_id);
drop policy if exists "Usuário altera suas placas" on public.placas;
create policy "Usuário altera suas placas" on public.placas
for update to authenticated
using ((select auth.uid()) = usuario_id)
with check ((select auth.uid()) = usuario_id);
drop policy if exists "Usuário remove suas placas" on public.placas;
create policy "Usuário remove suas placas" on public.placas
for delete to authenticated using ((select auth.uid()) = usuario_id);

drop policy if exists "Usuário consulta seu histórico" on public.historico_impressoes;
create policy "Usuário consulta seu histórico" on public.historico_impressoes
for select to authenticated using ((select auth.uid()) = usuario_id);
drop policy if exists "Usuário registra suas impressões" on public.historico_impressoes;
create policy "Usuário registra suas impressões" on public.historico_impressoes
for insert to authenticated with check ((select auth.uid()) = usuario_id);

insert into public.modelos_placa (id, nome, descricao, ordem)
values
  ('shopee', 'Workstation SPX', 'Três etiquetas verticais por folha', 1),
  ('saida', 'Placa de Identificação com QR Code', 'Placa horizontal com nome e QR Code', 2),
  ('nome', 'Placa de Nome — Folha Inteira', 'Uma placa horizontal por folha', 3),
  ('nome-duplo', 'Placas de Nome — 2 por Folha', 'Duas placas horizontais por folha', 4),
  ('nome-quatro', 'Placas de Nome — 4 por Folha', 'Quatro placas em grade por folha', 5),
  ('gaiola', 'QR Gaiola SPX', 'Ficha operacional completa de gaiola', 6),
  ('qr-simples', 'QR Code Simples', 'Etiqueta compacta com CG e QR Code', 7)
on conflict (id) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  ordem = excluded.ordem,
  atualizado_em = now();
