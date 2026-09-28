# Build the web app
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/
COPY packages/webapp/package.json packages/webapp/
RUN npm ci --ignore-scripts
COPY packages/webapp packages/webapp
RUN npm run build -w packages/webapp

# Runtime: API server + built web app, production dependencies only
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/
COPY packages/webapp/package.json packages/webapp/
RUN npm ci --omit=dev --ignore-scripts -w packages/core -w packages/server && npm cache clean --force
COPY packages/core/src packages/core/src
COPY packages/server/src packages/server/src
COPY --from=build /app/packages/webapp/dist packages/webapp/dist
USER node
EXPOSE 8080
CMD ["node", "packages/server/src/index.js"]
