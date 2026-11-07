# COLORLINK · imagen de producción (servidor Ubuntu con Docker Compose o Google Cloud Run)
#
# Etapa 1: compila el frontend (Vite). No necesita secretos: el navegador pide la
# configuración pública de Supabase al servidor (/api/config) al arrancar.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Etapa 2: solo dependencias de producción, el build y el código del servidor
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY server.ts tsconfig.json ./
COPY server ./server
# El servidor reutiliza los tipos y la paleta de colores del frontend
COPY src/types ./src/types
COPY src/data ./src/data

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/config').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npx", "tsx", "server.ts", "--production"]
