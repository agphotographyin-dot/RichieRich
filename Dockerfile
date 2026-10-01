# ==========================================
# Multi-stage production build for Richie Rich
# ==========================================

# Stage 1: Build stage (using Debian slim with glibc for native esbuild/tailwind compatibility)
FROM node:20-slim AS builder

WORKDIR /app

# Prevent memory fragmentation and OOM on low-memory VPS
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Copy dependency specifications
COPY package*.json ./

# Install all dependencies with resilience for peer deps and lockfile differences
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps --no-audit --no-fund

# Copy application source code
COPY . .

# Set environment argument defaults for build (defaults to empty for dynamic same-origin proxy)
ARG VITE_POCKETBASE_URL=""
ENV VITE_POCKETBASE_URL=$VITE_POCKETBASE_URL

# Build production assets (Vite build + postbuild SPA fallback generator)
RUN npm run build || npx vite build

# Stage 2: Production Nginx web server
FROM nginx:alpine

# Remove default nginx configuration
RUN rm -rf /etc/nginx/conf.d/default.conf

# Generate custom nginx configuration for SPA routing, gzip compression, and PocketBase proxy
RUN printf '%s\n' \
'server {' \
'    listen 80;' \
'    listen [::]:80;' \
'    server_name _;' \
'    root /usr/share/nginx/html;' \
'    index index.html index.htm;' \
'    gzip on;' \
'    gzip_vary on;' \
'    gzip_min_length 1024;' \
'    gzip_proxied expired no-cache no-store private auth;' \
'    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json image/svg+xml;' \
'    gzip_disable "MSIE [1-6]\.";' \
'    location /api/ {' \
'        proxy_pass http://pocketbase:8090/api/;' \
'        proxy_http_version 1.1;' \
'        proxy_set_header Upgrade $http_upgrade;' \
'        proxy_set_header Connection "upgrade";' \
'        proxy_set_header Host $host;' \
'        proxy_set_header X-Real-IP $remote_addr;' \
'        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' \
'        proxy_set_header X-Forwarded-Proto $scheme;' \
'        proxy_read_timeout 86400s;' \
'        proxy_send_timeout 86400s;' \
'        proxy_buffering off;' \
'        proxy_cache off;' \
'    }' \
'    location /_/ {' \
'        proxy_pass http://pocketbase:8090/_/;' \
'        proxy_http_version 1.1;' \
'        proxy_set_header Upgrade $http_upgrade;' \
'        proxy_set_header Connection "upgrade";' \
'        proxy_set_header Host $host;' \
'        proxy_set_header X-Real-IP $remote_addr;' \
'        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' \
'        proxy_set_header X-Forwarded-Proto $scheme;' \
'    }' \
'    location ~* \.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg|webp|avif)$ {' \
'        expires 6M;' \
'        access_log off;' \
'        add_header Cache-Control "public, max-age=15552000, immutable";' \
'        try_files $uri =404;' \
'    }' \
'    location / {' \
'        try_files $uri $uri/ /index.html;' \
'    }' \
'    add_header X-Frame-Options "SAMEORIGIN" always;' \
'    add_header X-Content-Type-Options "nosniff" always;' \
'    add_header Referrer-Policy "strict-origin-when-cross-origin" always;' \
'}' > /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port 80
EXPOSE 80

# Health check to ensure nginx is serving requests
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
