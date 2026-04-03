# Poker Planning - Frontend

Application frontend Next.js pour Poker Planning.

## Prerequis

- Node.js 22.x recommande
- npm 10+
- Backend Poker Planning accessible (API HTTP + Socket.IO)

## Installation

```bash
npm ci
```

## Configuration

Le frontend consomme l'API backend via la variable d'environnement suivante:

- `NEXT_PUBLIC_API_BASE_URL`: URL de base de l'API (ex: `http://localhost:3000/api`)

Exemple avec un fichier `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

Comportement par defaut:

- si `NEXT_PUBLIC_API_BASE_URL` est definie: cette valeur est utilisee
- sinon en navigateur: `<protocole>//<hostname>:3000/api`
- sinon cote serveur: `http://localhost:3000/api`

## Lancement

Mode developpement:

```bash
npm run dev
```

Application disponible par defaut sur `http://localhost:3000`.

Build de production:

```bash
npm run build
```

Execution du build:

```bash
npm run start
```

## Tests

Lancer toute la suite de tests (Vitest):

```bash
npm run test
```

## Commandes utiles

- `npm run dev`: lance Next.js en developpement
- `npm run build`: genere le build de production
- `npm run start`: demarre l'application en mode production
- `npm run test`: execute les tests unitaires/e2e Vitest

## Docker

Build de l'image:

```bash
docker build -t pokerplanning-web-app .
```

Le Dockerfile expose le port `3001` et lance l'app en production sur `0.0.0.0:3001`.

Pour surcharger l'URL backend au build:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_BASE_URL=http://host.docker.internal:3000/api \
  -t pokerplanning-web-app .
```
