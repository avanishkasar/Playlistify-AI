# Use Node.js 20
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY src ./src
COPY public ./public

# Build TypeScript
RUN npm run build

# Remove devDependencies
RUN npm prune --production

# Expose Apify container port (default 4321 for Standby mode)
EXPOSE 4321

# Start the server
CMD ["node", "dist/main.js"]
