# The official Playwright image ships Chromium and its system libraries already
# matched to the Playwright version, which is the whole reason this service is
# separate from the ingestion worker: the worker image stays small and the
# browser's memory cost is isolated to one scalable service.
FROM mcr.microsoft.com/playwright:v1.62.0-noble AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps

RUN npm ci --ignore-scripts \
  && npm run build --workspace=@missa/render-service

FROM mcr.microsoft.com/playwright:v1.62.0-noble

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/render-service/package.json ./packages/render-service/package.json
COPY --from=build /app/packages/render-service/dist ./packages/render-service/dist

USER pwuser
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "packages/render-service/dist/src/server.js"]
