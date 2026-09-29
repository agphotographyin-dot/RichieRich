# ==========================================
# Multi-stage production build for Richie Rich
# ==========================================

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install all dependencies
RUN npm ci || npm install

# Copy application source code
COPY . .

# Set environment argument defaults for build
ARG VITE_POCKETBASE_URL=http://187.126.115.40:8090
ENV VITE_POCKETBASE_URL=$VITE_POCKETBASE_URL

# Build production assets (Vite build + postbuild SPA fallback generator)
RUN npm run build

# Stage 2: Production Nginx web server
FROM nginx:alpine

# Remove default nginx configuration
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration for SPA routing & gzip
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port 80
EXPOSE 80

# Health check to ensure nginx is serving requests
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
