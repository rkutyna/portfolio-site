# Photo conversion worker (isolated)
FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache perl libc6-compat

COPY package*.json ./
RUN npm install

COPY worker.js derivatives.js ./

RUN mkdir -p /app/uploads && chown -R node:node /app

USER node
CMD ["node", "worker.js"]
