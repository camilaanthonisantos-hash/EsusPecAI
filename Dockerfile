# ==============================================================
# Dockerfile para e-SUS PEC AI
# Multi-Stage Build: Garante compilação automática e imagem leve
# ==============================================================

# 1. Stage de Build
FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . ./
RUN npm run build

# 2. Stage de Execução em Produção
FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copia manifestos e instala apenas dependências de produção
COPY package*.json ./
RUN npm install --omit=dev

# Copia arquivos compilados do stage builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json

# Prepara diretório de dados persistentes
RUN mkdir -p /app/data-store/videos

VOLUME ["/app/data-store"]

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
