FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml uv.lock README.md ./
COPY src ./src

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir '.[render]' \
    && playwright install --with-deps chromium

ENV PYTHONUNBUFFERED=1

# Keep the always-on worker on the bounded HTTP path by default. Pass
# --render deliberately for a source that needs browser execution.
CMD ["gary-pw-worker", "--max-index-pages", "50", "--poll-seconds", "60"]
