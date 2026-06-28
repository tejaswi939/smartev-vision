FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app
# All workspace manifests must be present or pnpm install errors on the workspace globs.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile
# Source needed to run the api via tsx (api + its workspace dep shared).
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN pnpm --filter @sev/api exec prisma generate
EXPOSE 4000
CMD ["sh","-c","pnpm --filter @sev/api exec prisma migrate deploy && pnpm --filter @sev/api exec tsx src/server.ts"]
