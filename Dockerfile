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

# Keep nginx as the default/final frontend image.
FROM nginx:stable-alpine AS frontend
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
