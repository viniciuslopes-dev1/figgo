# FigGo Admin Panel (Web)

Painel web recomendado (React + Firebase Hosting) para:

- Moderar posts
- Aprovar pontos no mapa
- Editar colecoes/album
- Banir spam
- Ver analytics

Colecoes sugeridas:

- `posts` (status: active|reported|blocked)
- `mapPoints` (approved: true|false)
- `albumCollections` (nome, tema, totalStickers)
- `reports` (targetType, targetId, reason, createdAt)

## MVP tecnico rapido

1. Criar app web separado com `vite` + `firebase`.
2. Reusar as mesmas regras e projeto Firebase.
3. Usar claims de admin no Auth para proteger rotas.
