# Painel Clientes AMG

Painel refeito como SPA moderna em React + TypeScript para Firebase Hosting, com:

- React 19 + TypeScript 5.9
- Vite 8
- Tailwind CSS 4
- Firebase Auth + Firestore modular
- IndexedDB com Dexie
- PWA com `manifest.webmanifest` + service worker manual
- testes com Vitest, Playwright e regras do Firestore

## O que entrou nesta versao

- Visao 360 do cliente com resumo, comercial, rota, timeline, tarefas, notas, vendas e edicao
- busca global por nome, codigo, CNPJ, telefone, cidade e rota
- command palette com `Ctrl+K` para navegar, abrir cliente e criar cadastro
- CRM operacional com estagio, prioridade, tags, canal preferido e proxima acao
- tela de tarefas com retornos, follow-ups e exportacao CSV
- tela de campanhas manuais com fila de WhatsApp, preview e exportacao XLSX
- views salvas e bulk actions na base de clientes
- tabela comercial mensal separada dos tiers historicos
- mensagens de WhatsApp com variaveis do painel
- worklists acionaveis para reativacao, proximidade de tabela, rota e qualidade de cadastro
- importacao com merge policy, preview de duplicidade por `codigo`/`cnpj` e bloqueio de conflitos
- diagnostico do painel com estado local, sync ledger e saude operacional
- migracao automatica do legado de `localStorage` para IndexedDB
- sync incremental com Firebase usando apenas `panelAdmins/<uid>` como autorizacao
- backups versionados locais com retencao configuravel e export/import em JSON

## Estrutura

- `src/app`: shell, rotas e store principal
- `src/features`: dashboard, clientes, rotas, tarefas, campanhas, importacoes, produtos, configuracoes, diagnostico e drawer 360
- `src/shared`: tipos, libs, calculos comerciais, Firebase, storage e UI base
- `scripts/check-bundle-budget.mjs`: budget de bundle para o CI
- `tests`: smoke e regras do Firestore

## Como rodar

```powershell
npm install
npm run dev
```

Build local:

```powershell
npm run build
npm run preview
```

## Testes

```powershell
npm run lint
npm run typecheck
npm run test:run
npm run test:rules
npm run build
npm run test:e2e
```

Observacao:

- `npm run test:rules` exige Java 21+ para o emulator atual do Firebase.

## Firebase

- projeto: `painelclientesamg`
- hosting: `painelclientesamg`
- auth: `email/password`
- regras: [firestore.rules](/C:/Projetos/Painel%20Clientes/firestore.rules)

Para liberar um admin:

1. crie o usuario no Authentication
2. pegue o `uid`
3. crie `panelAdmins/<uid>` no Firestore

## GitHub Actions

- `CI`: lint, typecheck, testes, build e smoke
- `CI`: tambem valida budget de bundle
- `Preview Deploy`: preview channel em PR
- `Production Deploy`: deploy de `hosting + firestore rules` no `main`

Consulte [docs/operacao.md](/C:/Projetos/Painel%20Clientes/docs/operacao.md) para a rotina de admins, tabela comercial, WhatsApp e backups.
