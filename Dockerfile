FROM node:24-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci \
  && npm run build --workspace=@missa/contracts \
  && npm run build --workspace=@missa/taxonomy \
  && npm run build --workspace=@missa/radar-engine \
  && npm run build --workspace=@missa/radar-adapters

ENV NODE_ENV=production
ENV RADAR_WORKER_BATCH_SIZE=100
ENV RADAR_MAX_TIER=0
ENV RADAR_USE_ADVISORY_LOCK=0
ENV RADAR_RESEARCH_BATCH_SIZE=25
ENV RADAR_RESEARCH_INTERVAL_MINUTES=5
ENV RADAR_DISCOVERY_BATCH_SIZE=100
ENV RADAR_DISCOVERY_INTERVAL_MINUTES=5
ENV RADAR_DISCOVERY_LINKS_PER_PAGE=50
ENV RADAR_DISCOVERY_CONCURRENCY=16
ENV RADAR_DISCOVERY_INTERVAL_HOURS=48
ENV MISSA_SOURCE_PROMOTION_BATCH_SIZE=50
ENV MISSA_SOURCE_PROMOTION_CONCURRENCY=12
ENV MISSA_SOURCE_PROMOTION_INTERVAL_MINUTES=5
ENV MISSA_SOURCE_PROMOTION_MODE=review
ENV RADAR_ENRICHMENT_BATCH_SIZE=20
ENV RADAR_ENRICHMENT_INTERVAL_MINUTES=10
ENV RADAR_REVIEW_BATCH_SIZE=20
ENV RADAR_REVIEW_INTERVAL_MINUTES=10
ENV RADAR_CONTENT_BATCH_SIZE=20
ENV RADAR_CONTENT_INTERVAL_MINUTES=10
ENV MISSA_TAXONOMY_DISCOVERY_BATCH_SIZE=8
ENV MISSA_TAXONOMY_DISCOVERY_RESULT_LIMIT=25
ENV MISSA_TAXONOMY_DISCOVERY_INTERVAL_MINUTES=15

CMD ["sh", "-c", "if [ \"$MISSA_WORKER_MODE\" = \"research\" ]; then npm run research-agent --workspace=@missa/radar-adapters; elif [ \"$MISSA_WORKER_MODE\" = \"discovery\" ]; then npm run discovery-agent --workspace=@missa/radar-adapters; elif [ \"$MISSA_WORKER_MODE\" = \"taxonomy-discovery\" ]; then npm run taxonomy-discovery --workspace=@missa/radar-adapters; elif [ \"$MISSA_WORKER_MODE\" = \"enrichment\" ]; then npm run enrichment-worker --workspace=@missa/radar-adapters; elif [ \"$MISSA_WORKER_MODE\" = \"content\" ]; then npm run content-worker --workspace=@missa/radar-adapters; elif [ \"$MISSA_WORKER_MODE\" = \"review\" ]; then npm run review-agent --workspace=@missa/radar-adapters; else npm run worker --workspace=@missa/radar-adapters; fi"]
