# Stage 1: Build native modules
FROM node:20-alpine AS modules
RUN apk add --no-cache python3 make g++ gcc
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build client application
FROM node:20-alpine AS client-builder
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
RUN npm ci
RUN cd client && npm ci
COPY . .
RUN cd client && npm run build

# Stage 3: Production image
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

# Copy package.json (for reference only)
COPY package*.json ./

# Copy pre-built node_modules with native dependencies
COPY --from=modules /app/node_modules ./node_modules

# Copy application files
COPY --from=client-builder /app/client/dist ./client/dist
COPY --from=client-builder /app/server ./server
COPY --from=client-builder /app/data ./data

# Create data directory with proper permissions
RUN mkdir -p /app/data && \
    chown -R node:node /app/data && \
    chmod 755 /app/data

# Copy and make executable the startup script
COPY wait-for-pocket-id.sh ./
RUN chmod +x wait-for-pocket-id.sh

# Set up user, ports, and health check
EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget -q --spider http://localhost:3000/auth/status || exit 1

ENTRYPOINT ["./wait-for-pocket-id.sh"]