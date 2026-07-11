# Dockerfile - Mineazy Big Spenders Tracking System

# Use lean Node Alpine image
FROM node:20-alpine

# Set directory
WORKDIR /app

# Copy dependency mappings
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy server code and database schema
COPY server.js schema.sql ./

# Copy static assets folder
COPY public/ ./public/

# Set env configs
ENV PORT=8000
ENV NODE_ENV=production

# Expose port
EXPOSE 8000

# Start Express server
CMD ["node", "server.js"]
