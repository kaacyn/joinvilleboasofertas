FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ARG NUXT_API_BASE=http://snap-api-dev:8000
ARG NUXT_PUBLIC_SITE_URL=https://joinvilleboasofertas-loc-app.cacin.dev
ENV NUXT_API_BASE=$NUXT_API_BASE
ENV NUXT_PUBLIC_SITE_URL=$NUXT_PUBLIC_SITE_URL
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV NUXT_API_BASE=http://snap-api-dev:8000
ENV NUXT_PUBLIC_SITE_URL=https://joinvilleboasofertas-loc-app.cacin.dev
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
