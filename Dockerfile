FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg git ca-certificates fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY *.mjs ./
COPY hiyuki ./hiyuki
RUN mkdir -p auth hiyuki/database hiyuki/arquivos/json && chown -R node:node auth hiyuki/database hiyuki/arquivos/json
USER node
CMD ["node", "bot.mjs"]
