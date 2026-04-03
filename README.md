# Poker Planning - Frontend

Next.js frontend application for Poker Planning.

## Prerequisites

- Recommended Node.js 22.x
- npm 10+
- Reachable Poker Planning backend (HTTP API + Socket.IO)

## Installation

```bash
npm ci
```

## Configuration

The frontend consumes the backend API through this environment variable:

- `NEXT_PUBLIC_API_BASE_URL`: API base URL (example: `http://localhost:3000/api`)

Example with a `.env.local` file:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

Default behavior:

- if `NEXT_PUBLIC_API_BASE_URL` is defined: this value is used
- otherwise in the browser: `<protocol>//<hostname>:3000/api`
- otherwise on the server: `http://localhost:3000/api`

## Run

Development mode:

```bash
npm run dev
```

The app is available by default at `http://localhost:3000`.

Production build:

```bash
npm run build
```

Run the production build:

```bash
npm run start
```

## Tests

Run the full test suite (Vitest):

```bash
npm run test
```

## Useful Commands

- `npm run dev`: start Next.js in development mode
- `npm run build`: build for production
- `npm run start`: start the app in production mode
- `npm run test`: run unit/e2e Vitest tests

## Docker

Build the image:

```bash
docker build -t pokerplanning-web-app .
```

The Dockerfile exposes port `3001` and runs the app in production on `0.0.0.0:3001`.

To override the backend URL at build time:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_BASE_URL=http://host.docker.internal:3000/api \
  -t pokerplanning-web-app .
```
