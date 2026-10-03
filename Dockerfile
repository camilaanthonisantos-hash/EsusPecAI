# ==============================================================
# Dockerfile para e-SUS PEC AI
# Imagem de Produção Leve com Deploy Imediato (Zero-Build no Host)
# ==============================================================

FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copia manifestos de dependências
COPY package*.json ./

# Instala apenas as dependências de produção (rápido e sem devDependencies pesadas)
RUN npm install --omit=dev

# Copia os arquivos pré-compilados do frontend e backend
COPY dist ./dist
COPY firebase-applet-config.json ./firebase-applet-config.json
COPY public ./public

# Prepara diretório de dados persistentes
RUN mkdir -p /app/data-store/videos

VOLUME ["/app/data-store"]

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
