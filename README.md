# FigGo

App mobile premium para colecionadores de figurinhas da Copa.

## Stack

- React Native + Expo
- Expo Router
- Supabase (Auth)
- React Native Maps
- Zustand

## Setup

1. Instale dependencias:

```bash
npm install
```

2. Crie `.env` com:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

3. Rode:

```bash
npx expo start -c
```

## Estrutura

- `app/` rotas com Expo Router
- `src/components/` componentes reutilizaveis de layout e UI
- `src/screens/` telas do app
- `src/constants/` dados e tokens centralizados
- `src/hooks/` hooks de dominio (album)
- `src/utils/` utilitarios puros
- `src/services/` integracoes (supabase)
- `src/store/` estado global (sessao)
- `src/theme/` contexto de tema

## Proximos passos de producao

- Integrar login social (Google/Apple) via Supabase Auth
- Persistir feed/mapa/album em banco de dados
- Ajustar fluxo de recuperacao de senha com deep link de app
