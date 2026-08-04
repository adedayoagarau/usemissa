FROM node:22-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci \
  && npm run build --workspace=@missa/contracts \
  && npm run build --workspace=@missa/radar-engine \
  && npm run build --workspace=@missa/radar-adapters

ENV NODE_ENV=production
ENV RADAR_WORKER_BATCH_SIZE=25
ENV RADAR_RESEARCH_BATCH_SIZE=25
ENV RADAR_RESEARCH_INTERVAL_MINUTES=5
ENV RADAR_ENRICHMENT_BATCH_SIZE=20
ENV RADAR_ENRICHMENT_INTERVAL_MINUTES=10
ENV RADAR_REVIEW_BATCH_SIZE=20
ENV RADAR_REVIEW_INTERVAL_MINUTES=10

CMD ["sh", "-c", "if [ \"$MISSA_WORKER_MODE\" = \"research\" ]; then npm run research-agent --workspace=@missa/radar-adapters; elif [ \"$MISSA_WORKER_MODE\" = \"enrichment\" ]; then npm run enrichment-worker --workspace=@missa/radar-adapters; elif [ \"$MISSA_WORKER_MODE\" = \"review\" ]; then npm run review-agent --workspace=@missa/radar-adapters; else npm run worker --workspace=@missa/radar-adapters; fi"]
