-- Acesso do painel administrativo aos modelos.
-- O painel não oferece cadastro público. Crie o administrador em Authentication > Users.
drop policy if exists "Administrador cria modelos" on public.modelos_placa;
create policy "Administrador cria modelos" on public.modelos_placa for insert to authenticated with check (true);
drop policy if exists "Administrador altera modelos" on public.modelos_placa;
create policy "Administrador altera modelos" on public.modelos_placa for update to authenticated using (true) with check (true);
drop policy if exists "Administrador remove modelos" on public.modelos_placa;
create policy "Administrador remove modelos" on public.modelos_placa for delete to authenticated using (true);
