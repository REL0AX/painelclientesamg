# Operacao do Painel AMG

## Admins

- O acesso online depende de um documento em `panelAdmins/<uid>`.
- O painel nao cria mais o primeiro admin automaticamente.
- Para liberar um usuario:
  - crie a conta no Authentication
  - pegue o `uid`
  - crie `panelAdmins/<uid>` no Firestore com `{ role: "owner" }` ou `{ role: "admin" }`

## Tabela comercial

- O contexto comercial usa o mes selecionado no painel.
- Quando a visao esta em `Ano inteiro`, a tabela comercial usa o mes atual em `America/Sao_Paulo`.
- Faixas iniciais:
  - `Tabela 1`: `0` a `999,99`
  - `Tabela 2`: `1.000` a `1.999,99`
  - `Tabela 3`: `2.000` a `3.499,99`
  - `Tabela 4`: `3.500` a `4.999,99`
  - `Tabela 5`: `5.000+`

## WhatsApp

- O painel abre `wa.me` com mensagem pronta.
- Nao existe envio por API nesta fase.
- Existe uma tela de `Campanhas` para montar fila manual por worklist e template.
- Cada abertura de template registra um evento `whatsapp-opened` no historico do cliente e na timeline.

## CRM operacional

- O cliente agora pode ser marcado por `estagio`, `prioridade`, `tags` e `canal preferido`.
- A tela de `Clientes` permite bulk actions para:
  - mudar estagio
  - mudar prioridade
  - aplicar tags
  - ajustar rota manual
  - criar tarefas em lote
- A tela de `Tarefas` centraliza retornos, follow-ups e pendencias.
- A `Visao 360` mostra timeline derivada, tarefas do cliente e edicao completa do cadastro.

## Views salvas e diagnostico

- Filtros importantes podem ser gravados em `views salvas` dentro da tela de clientes.
- A tela de `Diagnostico` mostra:
  - schema atual
  - pendencias do sync
  - estado da nuvem
  - volume local de dados
  - ultimo erro conhecido

## Backups

- O app salva o snapshot atual em IndexedDB.
- Operacoes destrutivas criam backup automatico antes da troca.
- O historico local usa a retencao definida em Configuracoes.
- Tambem e possivel exportar/importar JSON manualmente.
