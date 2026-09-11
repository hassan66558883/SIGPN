# ---------- build stage ----------
FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts
COPY . .
# DATABASE_URL is only needed at runtime; generate the client from the schema.
RUN npx prisma generate && npm run build

# ---------- runtime stage ----------
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3300 HOSTNAME=0.0.0.0
RUN addgroup -S pms && adduser -S pms -G pms \
 && apk add --no-cache postgresql18-client
COPY --from=builder --chown=pms:pms /app/.next/standalone ./
COPY --from=builder --chown=pms:pms /app/.next/static ./.next/static
COPY --from=builder --chown=pms:pms /app/public ./public
COPY --from=builder --chown=pms:pms /app/prisma ./prisma
COPY --from=builder --chown=pms:pms /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=pms:pms /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=pms:pms /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=pms:pms /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder --chown=pms:pms /app/deploy/entrypoint.sh ./entrypoint.sh
RUN mkdir -p /data/uploads /data/backups && chown -R pms:pms /data && chmod +x ./entrypoint.sh
USER pms
EXPOSE 3300
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3300/api/health || exit 1
ENTRYPOINT ["./entrypoint.sh"]
