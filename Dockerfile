# ==========================================
# Dockerfile para e-SUS PEC AI
# Otimizado para compilação Linux no Portainer
# ==========================================

FROM node:22-slim AS builder

WORKDIR /app

# Instala dependências do sistema para módulos nativos (Linux x64)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copia manifestos de dependência
COPY package*.json ./

# Usa npm install para resolver corretamente os binários nativos do Linux (esbuild, rollup, tailwind oxide)
RUN npm install

# Copia código-fonte da aplicação
COPY . .

# Garante heap de memória suficiente para o Vite empacotar a aplicação
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Compila o frontend Vite e o servidor backend Node (esbuild -> dist/server.cjs)
RUN npm run build

# Remove pacotes de desenvolvimento
RUN npm prune --production

# ==========================================
# Imagem de Execução (Produção)
# ==========================================
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copia artefatos de build e dependências de produção
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json
COPY --from=builder /app/public ./public

# Cria estrutura inicial de dados
RUN mkdir -p /app/data-store/videos

VOLUME ["/app/data-store"]

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
