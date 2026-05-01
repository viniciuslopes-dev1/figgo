# FigGo

App mobile premium para colecionadores de figurinhas da Copa.

## Stack

- React Native + Expo
- Expo Router
- Firebase (Auth, Firestore, Storage)
- Expo Notifications
- React Native Maps
- Zustand

## Setup

1. Instale dependencias:

```bash
npm install
```

2. Crie `.env` com:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

3. Para Android, adicione `google-services.json` na raiz.
4. Para iOS, adicione `GoogleService-Info.plist` na raiz.
5. Rode:

```bash
npx expo start -c
```

## Estrutura

- `app/` rotas (login + tabs mapa/feed/album/perfil)
- `src/store/` estado global (sessao, mapa, feed, album)
- `src/services/` firebase, firestore e notificacoes
- `src/theme/` tema premium dark/light
- `firebase/` regras Firestore e Storage
- `admin-panel/` especificacao do painel de moderacao

## Proximos passos de producao

- Integrar login Google/Apple/Email real
- Persistir feed/mapa/album integralmente no Firestore
- Ativar FCM com Cloud Functions para eventos sociais
- Publicar admin web em Firebase Hosting
