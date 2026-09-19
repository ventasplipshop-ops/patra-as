FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Internal filesystem API. No frontend build or environment file in this image.
FROM node:20-alpine AS transferencias
WORKDIR /app
ENV NODE_ENV=production \
    PLIP_API_ONLY=1 \
    PORT=8080 \
    TRANSFERENCIAS_DIR=/data/transferencias
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY server/plip-server.mjs ./server/plip-server.mjs
USER 1000:1000
EXPOSE 8080
CMD ["node", "server/plip-server.mjs"]

# VideoLab owns its data and serial render queue; no Transferencias filesystem mount.
FROM node:20-bookworm-slim AS videolab
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=8090 VIDEOLAB_DIR=/data/videolab MUSICA_DIR=/data/musica
COPY server/videolab ./server/videolab
USER 1000:1000
EXPOSE 8090
CMD ["node", "--max-old-space-size=96", "server/videolab/server.mjs"]

# Keep nginx as the default/final frontend image.
FROM nginx:stable-alpine AS frontend
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
