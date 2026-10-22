FROM node:24.22.1-trixie-slim AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM node:24.22.1-trixie-slim AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM gcr.io/distroless/nodejs24-debian13:nonroot AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3001

COPY --chown=nonroot:nonroot --from=build /app/.next/standalone ./
COPY --chown=nonroot:nonroot --from=build /app/.next/static ./.next/static
COPY --chown=nonroot:nonroot --from=build /app/app ./app

EXPOSE 3001

CMD ["server.js"]
