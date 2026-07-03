# Build stage
FROM node:22-alpine AS builder

WORKDIR /build

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Runtime stage - minimal image to serve static files
FROM node:22-alpine

WORKDIR /app

# Install a simple HTTP server to serve the built frontend
RUN npm install -g serve

# Copy built frontend from builder
COPY --from=builder /build/dist ./dist

# Expose port for frontend
EXPOSE 3000

# Serve the frontend
CMD ["serve", "-s", "dist", "-l", "3000"]
