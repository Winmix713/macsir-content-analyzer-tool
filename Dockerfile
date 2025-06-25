# WinMix Multi-stage Dockerfile

# Frontend build stage
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY tsconfig.json vite.config.ts tailwind.config.js ./

# Build frontend
RUN npm run build

# Backend PHP stage
FROM php:8.2-fpm-alpine AS backend

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libxml2-dev \
    zip \
    unzip \
    sqlite \
    sqlite-dev

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_sqlite

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app/backend

# Copy backend files
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --optimize-autoloader

COPY backend/ ./

# Create necessary directories
RUN mkdir -p data logs cache \
    && chown -R www-data:www-data data logs cache \
    && chmod -R 755 data logs cache

# Production stage
FROM nginx:alpine AS production

# Install PHP-FPM
RUN apk add --no-cache php82-fpm php82-pdo php82-pdo_sqlite php82-json php82-session

# Copy Nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist /var/www/html

# Copy backend
COPY --from=backend /app/backend /var/www/html/api

# Copy startup script
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]