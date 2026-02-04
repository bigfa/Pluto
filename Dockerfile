FROM node:20-bullseye AS build

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-bullseye-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
    && apt-get install -y --no-install-recommends sqlite3 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/sql ./sql
COPY --from=build /app/scripts ./scripts

EXPOSE 3000

ENTRYPOINT ["sh", "./scripts/docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
