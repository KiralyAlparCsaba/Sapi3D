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

# Install dependencies (npm install to pick up any new packages added to package.json)
RUN npm install

# Copy source code
COPY . .

# Inject production API base URL at build time.
# This ensures the built frontend calls the same-origin reverse proxy (/api)
# instead of attempting to call localhost.
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

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
