# AGENTS.md — Painel de Clientes AMG

## Produto canônico

Este é o CRM AMG maduro e o produto canônico para gestão comercial de clientes.

- Stack: React 19, Vite, TypeScript, Firebase Auth/Firestore, Dexie/IndexedDB e PWA.
- Produção possui CI, preview e deploy.
- `REL0AX/amg-clientes-panel` é protótipo separado; não duplicar evolução nos dois.

## Invariantes

- Preservar `panelAdmins/{uid}`, perfis, regras e isolamento de usuário.
- IndexedDB é parte do produto: toda alteração de schema exige versão, migração testada, compatibilidade e rollback.
- Importação XLSX/CSV deve validar colunas, tipos, datas, duplicidades e volume antes de persistir.
- Nunca versionar planilha, nome, telefone, histórico ou dado real de cliente.
- Regras de score, queda, reativação e fila comercial precisam de testes antes de mudar.
- WhatsApp só abre contato preparado; não enviar mensagem automaticamente.

## Segurança

- Migrar deploy de service account JSON para WIF; não criar nova chave permanente.
- `VITE_*` é público.
- Firestore Rules autorizam; UI não substitui segurança.
- App Check deve ser mantido/implantado antes de ampliar backend.
- Logs, fixtures, screenshots e exports de teste não contêm PII real.
- Migração ou limpeza começa em dry-run e exige autorização para `--apply`.

## Validação

```bash
npm ci
npm run lint
npm run typecheck
npm run test:run
npm run test:rules
npm run build
npm run test:e2e
```

Use os scripts existentes e documente qualquer indisponibilidade. Não reduza gate para obter CI verde.

## Git e entrega

Branch, PR, checks verdes e deploy aprovado. Migração, Rules, Auth, PWA, IndexedDB, scripts e workflow exigem revisão explícita. Não publicar a partir de fork/protótipo.
