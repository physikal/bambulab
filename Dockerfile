# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --production

# Copy built frontend and server files
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/server ./src/server
COPY --from=build /app/src/shared ./src/shared

# Create data directory for SQLite
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/database.sqlite

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "--loader", "ts-node/esm", "src/server/index.ts"]