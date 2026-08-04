FROM node:22-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps ./apps
COPY packages ./packages
COPY tsconfig.json ./

RUN npm ci \
  && npm run build --workspace=@missa/contracts \
  && npm run build --workspace=@missa/radar-engine \
  && npm run build --workspace=@missa/radar-adapters

ENV NODE_ENV=production
ENV RADAR_RESEARCH_BATCH_SIZE=25
ENV RADAR_RESEARCH_INTERVAL_MINUTES=5

CMD ["npm", "run", "research-agent", "--workspace=@missa/radar-adapters"]
