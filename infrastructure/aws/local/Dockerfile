# Runs the OpenNext server function (local-test variant, OPEN_NEXT_LOCAL=1)
# behind harness.mjs, laid out like Lambda (/var/task).
#
#   docker build -f infrastructure/aws/local/Dockerfile -t usba-lambda-local .
#   docker run --rm -p 3300:3300 --env-file <env> usba-lambda-local
# The container port must equal the published one: Next fetches redirect
# targets from the viewer host (x-forwarded-host), e.g. localhost:3300.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends unzip && rm -rf /var/lib/apt/lists/*
COPY dist/aws-local/server-function.zip /tmp/fn.zip
RUN mkdir -p /var/task && unzip -q /tmp/fn.zip -d /var/task && rm /tmp/fn.zip
COPY dist/aws-local/cache /var/task/cache
COPY dist/aws-local/assets /var/assets
COPY infrastructure/aws/local/harness.mjs /opt/harness.mjs
ENV NODE_ENV=production OPEN_NEXT_LOCAL=1
EXPOSE 3300
CMD ["node", "/opt/harness.mjs", "/var/task", "/var/assets", "3300"]
