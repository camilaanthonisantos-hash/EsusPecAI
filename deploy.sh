#!/bin/bash
set -e

echo "🚀 [Deploy e-SUS PEC AI] Iniciando atualização na VPS..."

# 1. Atualizar repositório Git
echo "📥 Baixando últimas alterações do Git..."
git pull origin main

# 2. Instalar dependências
echo "📦 Instalando dependências..."
npm install

# 3. Compilar projeto
echo "🔨 Compilando Frontend (Vite) e Backend (esbuild)..."
npm run build

# 4. Reiniciar processo
if command -v pm2 &> /dev/null; then
    echo "🔄 Reiniciando via PM2..."
    pm2 restart ecosystem.config.cjs || pm2 start ecosystem.config.cjs
    pm2 save
elif [ -f "docker-compose.yml" ] && command -v docker &> /dev/null; then
    echo "🔄 Reiniciando via Docker Compose..."
    docker compose down
    docker compose up -d --build
else
    echo "⚠️ PM2 ou Docker não detectados automaticamente."
    echo "Execute manualmente: npm run start"
fi

echo "✅ [Deploy Concluído com Sucesso] Aplicação rodando em peccapsai.mentoriajrs.com!"
