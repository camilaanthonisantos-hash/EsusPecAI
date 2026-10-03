# ==========================================
# Dockerfile para e-SUS PEC AI
# ==========================================

FROM node:22-slim AS builder

WORKDIR /app

# Instala dependências completas para o build
COPY package*.json ./
RUN npm ci

# Copia todo o código-fonte
COPY . .

# Compila o frontend Vite e o servidor backend Node (esbuild -> dist/server.cjs)
RUN npm run build

# Remove dependências de desenvolvimento para economizar espaço
RUN npm prune --production

# ==========================================
# Imagem de Execução (Produção)
# ==========================================
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copia os artefatos de produção e módulos essenciais
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json
COPY --from=builder /app/public ./public
COPY --from=builder /app/data-store ./data-store

# Cria diretórios de persistência com permissões adequadas
RUN mkdir -p /app/data-store/videos

VOLUME ["/app/data-store"]

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
