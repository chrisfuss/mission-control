FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app

# Copy server dependencies
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules

# Copy built files
COPY --from=build /app/dist ./dist

# Create data directory for SQLite
RUN mkdir -p /data && chown -R 1000:1000 /data

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/mission-control.db

USER 1000
EXPOSE 3000

CMD ["node", "dist/server/index.js"]
