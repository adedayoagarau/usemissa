FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml uv.lock README.md ./
COPY src ./src

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir '.[render]' \
    && playwright install --with-deps chromium

ENV PYTHONUNBUFFERED=1

# The same immutable image runs both Railway lanes. Crawler remains the safe
# default for the existing service; the reviewer service sets
# GARY_WORKER_MODE=reviewer.
CMD ["sh", "-c", "if [ \"$GARY_WORKER_MODE\" = \"reviewer\" ]; then exec gary-review-worker --poll-seconds 60; else exec gary-pw-worker --max-index-pages 50 --poll-seconds 60; fi"]
