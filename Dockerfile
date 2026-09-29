# Stage 1: Build the production application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (cached if package files don't change)
COPY package*.json ./
RUN npm ci || npm install

# Copy source code and config files
COPY . .

# Build production bundle and generate SPA routes
RUN npm run build

# Stage 2: High-performance Nginx production web server
FROM nginx:alpine

# Copy built distribution assets to Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx configuration optimized for React SPA routing, caching, and gzip compression
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose standard web port
EXPOSE 80

# Health check to ensure the container is healthy
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
