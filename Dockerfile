FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN chmod +x start.sh

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:./build.db"
ENV PRISMA_HIDE_UPDATE_MESSAGE=1

RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["./start.sh"]
