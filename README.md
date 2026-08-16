# SPX Express — Gerador de Placas Operacionais

Site para geração e impressão de placas operacionais SPX Express, com suporte a:

- 🛒 **Placa Shopee / WS** — 3 colunas por folha, com código, número, QR e posto
- 📤 **Placa de Saída (OUT)** — Código OUT + QR, layout paisagem  
- 👤 **Placa de Nome** — Nome grande com listras zebra
- 📦 **QR Gaiola SPX** — Placas em série com instruções operacionais completas

## Medidas de Impressão

| Modelo       | Elemento | X                     | Y     | Largura | Altura | Fonte |
|--------------|-----------|-----------------------|-------|---------|--------|-------|
| Placa Grande | Nome      | 0.73"                 | 2.31" | 4.54"   | 0.85"  | 48pt  |
| Placa Grande | QR        | 5.14"                 | 1.01" | 4.05"   | 3.60"  | —     |
| WS           | Nome      | 0.41 / 3.74 / 7.07"  | 1.62" | 2.42"   | 0.30"  | 14pt  |
| WS           | QR        | 0.37 / 3.70 / 7.03"  | 1.85" | 2.57"   | 2.36"  | —     |
| WS           | Posto     | 0.41 / 3.74 / 7.07"  | 4.25" | 2.42"   | 0.30"  | 12pt  |
| Simples      | Nome      | 1.32"                 | 1.83" | 7.30"   | 1.57"  | 80pt  |

## Deploy

Projeto configurado para Vercel (site estático).

## Tecnologias

- HTML5 + CSS3 + JavaScript Vanilla
- [qrcode.js](https://github.com/soldair/node-qrcode) via CDN
- Google Fonts (Inter)
- Vercel (deploy)

## Painel administrativo

Abra `/admin.html` para editar os modelos sem usar IA. Antes do primeiro acesso:

1. Execute `supabase/migrations/20260814_admin_modelos.sql` no Editor SQL.
2. Crie seu usuário em **Authentication > Users** no Supabase.
3. Em **Project Settings > API**, copie a URL e a chave pública `publishable` ou `anon`.
4. Informe esses dados em `/admin.html` e entre com seu usuário.

Para que as alterações apareçam para todos os visitantes, informe a URL e a chave pública em `supabase-config.js` antes de publicar.

Nunca utilize a chave `service_role` no navegador.

## Atualizar GitHub e Vercel

```powershell
git add index.html style.css admin.html admin.css admin.js supabase README.md
git commit -m "Adiciona painel administrativo com Supabase"
git push origin main
```

O repositório conectado à Vercel será implantado automaticamente após o `git push`.
