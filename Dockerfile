# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/

RUN npm ci
RUN cd client && npm ci

# Copy source code
COPY . .

RUN cd client && npm run build

# Production stage
FROM node:20-alpine AS production

ENV NODE_ENV=production

# Create app directory
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/server ./server
COPY --from=build /app/data ./data

# Create data directory with proper permissions (in case sqlite is used)
RUN mkdir -p /app/data && \
    chown -R node:node /app/data && \
    chmod 755 /app/data

COPY wait-for-pocket-id.sh ./

EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -q --spider http://localhost:3000/auth/status || exit 1

ENTRYPOINT ["./wait-for-pocket-id.sh"]