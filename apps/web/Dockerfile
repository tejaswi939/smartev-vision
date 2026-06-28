FROM node:20-slim AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
ENV VITE_API_URL=/api/v1
RUN pnpm --filter @sev/web build
FROM nginx:alpine
# The nginx image renders /etc/nginx/templates/*.template (envsubst) at startup; our entrypoint
# scripts (15-resolver, 25-validate) run alongside the image's own to fill ${NGINX_RESOLVER} and
# validate the result. Default upstream is localhost:4000 when API_UPSTREAM is unset (local dev);
# docker-compose sets api:4000, and Render injects the api's private host:port.
ENV API_UPSTREAM=localhost:4000
COPY apps/web/nginx.conf /etc/nginx/templates/default.conf.template
COPY apps/web/docker-entrypoint.d/ /docker-entrypoint.d/
RUN chmod +x /docker-entrypoint.d/15-resolver.envsh /docker-entrypoint.d/25-validate-nginx.sh
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
