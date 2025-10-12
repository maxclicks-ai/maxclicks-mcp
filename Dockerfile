# Production Dockerfile for Maxclicks MCP Server
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY index.ts server.ts ./
RUN npm run build && npm prune --production

FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init curl && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/build ./build
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

USER nodejs

EXPOSE 7004

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:7004/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "build/server.js"]
