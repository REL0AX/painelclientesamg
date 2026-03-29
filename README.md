# Painel Clientes AMG

Painel de clientes da AMG Peças preparado para:

- rodar localmente como app web
- publicar no Firebase Hosting
- versionar e automatizar deploy via GitHub Actions
- usar `localStorage` como fallback e Firebase como modo online

## Estrutura

- `public/index.html`: painel principal
- `public/firebase-config.js`: configuracao ja ligada ao app web `amgpainelclientes`
- `firebase.json`: configuracao do Hosting, do Firestore e do Authentication
- `firestore.rules`: regras do banco
- `.github/workflows/firebase-deploy.yml`: deploy automatico pelo GitHub
- `.firebaserc`: projeto padrao do Firebase CLI

## Como rodar localmente

```powershell
npm install
npm run serve
```

Se quiser testar pelo emulador do Firebase:

```powershell
npm run firebase:emulators
```

## Como ligar no Firebase

1. O app web `amgpainelclientes` ja esta configurado em `public/firebase-config.js`.
2. O Authentication com Email/Password ja foi provisionado por deploy.
3. O Firestore ja foi criado no projeto `painelclientesamg`.
4. O repositorio ja aponta para `painelclientesamg` em `.firebaserc` e `firebase.json`.
5. O email `admin@admin.com.br` ja esta liberado como primeiro admin.

### Bootstrap do primeiro admin

1. O usuario `admin@admin.com.br` ja foi criado no Firebase Authentication.
2. O documento `panelAdmins/cjP4TelhQzZ68RlWfbjM42fcMje2` ja foi criado no Firestore.
3. Se quiser criar outros admins depois, adicione novos documentos em `panelAdmins/<SEU_UID>`.

Depois disso, o modo online passa a salvar no Firebase para esse usuario autenticado.

## Como publicar manualmente

```powershell
firebase login
npm run firebase:deploy
```

## Como publicar pelo GitHub

No repositorio, configure:

- GitHub Secret: `FIREBASE_SERVICE_ACCOUNT`
- GitHub Variable opcional: `FIREBASE_PROJECT_ID` se quiser sobrescrever o projeto padrao

O secret `FIREBASE_SERVICE_ACCOUNT` deve conter o JSON completo da service account do Firebase/GCP.

Sem variavel extra, o workflow publica em `painelclientesamg` e mantem Hosting, regras e Authentication alinhados. Quando fizer push para `main`, o arquivo `.github/workflows/firebase-deploy.yml` publica o painel automaticamente.
