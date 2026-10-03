# ==============================================================
# Dockerfile Multi-Stage para e-SUS PEC AI
# Compilação Automática (Builder) + Imagem Final de Produção Leve
# ==============================================================

# --- Etapa 1: Builder (Compilação do Frontend e Backend) ---
FROM node:22-slim AS builder

WORKDIR /app

# Copia manifestos de dependências
COPY package*.json ./

# Instala todas as dependências (incluindo Vite, TypeScript e esbuild)
RUN npm install

# Copia todo o código fonte
COPY . .

# Executa a compilação (gera dist/ para frontend e dist/server.cjs para backend)
RUN npm run build

# --- Etapa 2: Runner (Imagem de Produção Leve) ---
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copia manifestos de dependências
COPY package*.json ./

# Instala apenas as dependências de produção
RUN npm install --omit=dev

# Copia os artefatos compilados da etapa de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json
COPY --from=builder /app/public ./public

# Prepara diretório de dados persistentes
RUN mkdir -p /app/data-store/videos

VOLUME ["/app/data-store"]

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
