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

- Visao 360 do cliente com resumo, comercial, rota, historico, notas, vendas e edicao
- busca global por nome, codigo, CNPJ, telefone, cidade e rota
- tabela comercial mensal separada dos tiers historicos
- mensagens de WhatsApp com variaveis do painel
- worklists acionaveis para reativacao, proximidade de tabela, rota e qualidade de cadastro
- migracao automatica do legado de `localStorage` para IndexedDB
- sync com Firebase usando apenas `panelAdmins/<uid>` como autorizacao
- backups versionados locais e export/import em JSON

## Estrutura

- `src/app`: shell, rotas e store principal
- `src/features`: dashboard, clientes, rotas, importacoes, produtos, configuracoes e drawer 360
- `src/shared`: tipos, libs, calculos comerciais, Firebase, storage e UI base
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
- `Preview Deploy`: preview channel em PR
- `Production Deploy`: deploy de `hosting + firestore rules` no `main`

Consulte [docs/operacao.md](/C:/Projetos/Painel%20Clientes/docs/operacao.md) para a rotina de admins, tabela comercial, WhatsApp e backups.
