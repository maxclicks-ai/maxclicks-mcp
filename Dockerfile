# Production Dockerfile for Maxclicks MCP Server
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and local SDK tarball
COPY maxclicks-mcp/package*.json maxclicks-mcp/tsconfig.json ./
COPY maxclicks-mcp/maxclicks-node-sdk-1.0.0.tgz ./

# Install dependencies
RUN npm install --production=false

# Copy source files
COPY maxclicks-mcp/src ./src

# Build and prune dev dependencies
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
