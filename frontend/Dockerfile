FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY frontend/ .

# Build
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve to run the production build
RUN npm install -g serve

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

# Run application
CMD ["serve", "-s", "dist", "-l", "3000"]
