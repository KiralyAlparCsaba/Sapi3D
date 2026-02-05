# Frontend Dockerfile

# ============================================
# STAGE 1: Build Stage (Development)
# ============================================
FROM node:22-alpine AS build

WORKDIR /app

# Install qrencode for QR code generation (mobile testing)
# libqrencode-tools provides the qrencode command
RUN apk add --no-cache libqrencode-tools

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ============================================
# STAGE 2: Production Stage (Nginx)
# ============================================
FROM nginx:alpine

# Install qrencode in production stage too (for mobile testing)
# Note: Multi-stage builds don't inherit packages from previous stages
RUN apk add --no-cache libqrencode-tools

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
