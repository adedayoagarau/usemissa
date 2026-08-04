# Missa research agent

Build from the repository root and run on a container host with a restart
policy (Railway, Render, Fly, or equivalent):

```sh
docker build -f docker/research-agent/Dockerfile -t missa-research-agent .
docker run --restart=always \
  -e DATABASE_URL="$DATABASE_URL" \
  -e RADAR_RESEARCH_BATCH_SIZE=25 \
  -e RADAR_RESEARCH_INTERVAL_MINUTES=5 \
  missa-research-agent
```

The agent respects the source fetcher’s robots and timeout rules. It does not
publish directory discoveries as verified opportunities automatically.
