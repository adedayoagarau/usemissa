FROM node:24-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps

RUN npm ci --ignore-scripts
RUN npm run build --workspace=@missa/taxonomy \
  && npm run build --workspace=@missa/radar-engine \
  && npm run build --workspace=@missa/ingestion-v2

FROM node:24-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/taxonomy/package.json ./packages/taxonomy/package.json
COPY --from=build /app/packages/taxonomy/dist ./packages/taxonomy/dist
COPY --from=build /app/packages/radar-engine/package.json ./packages/radar-engine/package.json
COPY --from=build /app/packages/radar-engine/dist ./packages/radar-engine/dist
COPY --from=build /app/packages/ingestion-v2/package.json ./packages/ingestion-v2/package.json
COPY --from=build /app/packages/ingestion-v2/dist ./packages/ingestion-v2/dist

CMD ["node", "packages/ingestion-v2/dist/src/worker.js"]
