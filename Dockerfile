FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Copy root package files and install dependencies
COPY package*.json ./
RUN npm ci || npm install

# Copy application source
COPY . .

# Install frontend dependencies and build production static bundle
RUN cd src/frontend && npm ci || npm install && npm run build

EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=production

CMD ["npm", "start"]
