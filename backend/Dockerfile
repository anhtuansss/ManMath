FROM node:24.14.1-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json server.ts ./
COPY src ./src

# Chỉ là URL giả để Prisma config đọc được khi generate.
# Không dùng Supabase URL thật ở Docker build.
ENV DATABASE_URL=postgresql://prisma:prisma@localhost:5432/manmath?schema=public

RUN npm run build

FROM node:24.14.1-bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install --no-install-recommends -y openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

COPY --from=build /app/dist ./dist

# Prisma Client đã generate ở build stage:
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 5000

# Dùng contract npm đã tạo ở Step 2:
CMD ["npm", "run", "start"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:5000/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"