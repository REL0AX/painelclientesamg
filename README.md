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
- `Production Deploy`: a qualidade continua executando no `main`; a publicação de `hosting + firestore rules` exige execução manual e `CRM_DEPLOY_ENABLED=true`.
- `Preview Deploy`: só publica quando `CRM_PREVIEW_DEPLOY_ENABLED=true`. Abrir uma PR, por si só, não publica uma aplicação.

Em 16/10/2026 os dois controles de publicação estavam ausentes nas variáveis do repositório e permanecem desativados por padrão. O check canônico de qualidade é `CRM CI`, distinto do job de qualidade da publicação.

A publicação ainda usa o secret existente `FIREBASE_SERVICE_ACCOUNT`; nenhuma chave nova foi criada. A migração para WIF depende de acesso administrativo ao projeto `painelclientesamg`: a identidade Google Cloud usada na preparação recebeu `PERMISSION_DENIED` ao consultar seus metadados. Não habilitar os controles de publicação até reconciliar projeto, identidade, permissões e o fluxo oficial. Os logs do deploy antigo de 25/03/2026 expiraram no GitHub; a causa daquela falha não foi comprovada.

Consulte [docs/operacao.md](/C:/Projetos/Painel%20Clientes/docs/operacao.md) para a rotina de admins, tabela comercial, WhatsApp e backups.
