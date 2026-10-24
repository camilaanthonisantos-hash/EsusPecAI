# ==============================================================
# Dockerfile para e-SUS PEC AI
# Imagem de Produção Leve com Deploy Imediato (Zero-Build no Host)
# e Fallback Automático caso dist/ não venha no commit
# ==============================================================

FROM node:22-slim AS builder

WORKDIR /app

# Copia manifestos de dependências
COPY package*.json ./

# Copia código do projeto e dist pré-compilado (se existir)
COPY . .

# Se dist/server.cjs e dist/index.html já existirem, pula o build (zero RAM, deploy instantâneo).
# Caso dist tenha sido apagado ou falte no commit, executa npm install e compila como fallback seguro!
RUN if [ -f "dist/server.cjs" ] && [ -f "dist/index.html" ]; then \
      echo "✅ [Docker Build] dist pré-compilado detectado com sucesso! Pulando compilação."; \
    else \
      echo "⚠️ [Docker Build] dist ausente ou incompleto no repositório! Executando compilação de contingência..."; \
      npm install --ignore-scripts --no-audit --no-fund && \
      npm run build; \
    fi

# ==============================================================
# Imagem de Produção Final (Mínima e Rápida)
# ==============================================================
FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copia manifestos de dependências
COPY package*.json ./

# Instala apenas as dependências de produção sem rodar scripts desnecessários
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund

# Copia os arquivos pré-compilados garantidos pelo estágio builder
COPY --from=builder /app/dist ./dist
COPY public ./public

# Prepara diretório de dados persistentes
RUN mkdir -p /app/data-store/videos

VOLUME ["/app/data-store"]

EXPOSE 3000

CMD ["node", "dist/server.cjs"]