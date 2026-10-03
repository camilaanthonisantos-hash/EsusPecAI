# 🚀 Guia de Deploy - e-SUS PEC AI na VPS Contabo

Este guia orienta todo o processo de deploy do **e-SUS PEC AI** na VPS da **Contabo** para o domínio:
👉 **`peccapsai.mentoriajrs.com`**

---

## 📋 Pré-requisitos & Checklist Inicial

1. **IP da sua VPS Contabo** (ex: `198.51.100.123`)
2. **Acesso SSH à VPS** (como `root` ou usuário com `sudo`)
3. **Chaves de API** (Gemini, OpenAI, Groq, etc.)
4. **Painel de DNS do domínio `mentoriajrs.com`** (Cloudflare, Hostinger, Registro.br, etc.)

---

## 🌐 Etapa 1: Configurar o DNS (Apontamento)

No painel onde o domínio `mentoriajrs.com` está hospedado (ex: Cloudflare):
1. Crie um novo registro DNS:
   - **Tipo:** `A`
   - **Nome / Subdomínio:** `peccapsai`
   - **Destino (IPv4):** `IP_DA_SUA_VPS_CONTABO`
   - **Proxy (se for Cloudflare):** Desative inicialmente (deixe a nuvem **cinza / DNS Only**) para facilitar a geração do certificado SSL do Certbot. Após gerar o SSL, você pode reativar se quiser.
   - **TTL:** Automático ou 2 minutos.

---

## 💻 Etapa 2: Acessar a VPS e Instalar Dependências

Acesse sua VPS via terminal:
```bash
ssh root@IP_DA_SUA_VPS
```

Atualize o sistema:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw nginx certbot python3-certbot-nginx
```

### Instalar Node.js 22 LTS e PM2:
```bash
# Adicionar repositório Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PM2 globalmente para gerenciar o processo 24/7
sudo npm install -g pm2
```

*(Opcional: Se preferir rodar com Docker em vez de PM2, instale o Docker com `curl -fsSL https://get.docker.com | sh`)*

---

## 📂 Etapa 3: Clonar o Projeto e Configurar

1. Acesse o diretório `/var/www` e clone o repositório:
```bash
cd /var/www
git clone https://github.com/camilaanthonisantos-hash/EsusPecAI.git esus-pec-ai
cd esus-pec-ai
```

2. Crie o arquivo `.env`:
```bash
cp .env.example .env
nano .env
```
Preencha suas variáveis (especialmente `GEMINI_API_KEY` e confirme `APP_URL="https://peccapsai.mentoriajrs.com"`).  
Para salvar no nano: aperte `Ctrl + O`, depois `Enter`, e `Ctrl + X` para sair.

3. Instale as dependências e compile:
```bash
npm install
npm run build
```

---

## ⚙️ Etapa 4: Iniciar o App com PM2

Inicie a aplicação utilizando a configuração pronta do repositório:
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```
*(Copie e execute o comando que o `pm2 startup` exibir no terminal para garantir que o app reinicie automaticamente caso a VPS reinicie).*

Para verificar se o app está rodando:
```bash
pm2 status
curl http://127.0.0.1:3000
```

---

## 🔒 Etapa 5: Configurar Nginx e Certificado SSL (HTTPS)

1. Crie o arquivo de configuração do site no Nginx:
```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/peccapsai.mentoriajrs.com
```

2. Ative o site criando um link simbólico:
```bash
sudo ln -s /etc/nginx/sites-available/peccapsai.mentoriajrs.com /etc/nginx/sites-enabled/
```

3. Teste e recarregue o Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

4. Emita o certificado SSL gratuito da Let's Encrypt com o Certbot:
```bash
sudo certbot --nginx -d peccapsai.mentoriajrs.com
```
*Siga as instruções na tela (digite seu e-mail e aceite os termos). O Certbot configurará o redirecionamento automático de HTTP para HTTPS.*

---

## 🛡️ Etapa 6: Ajustar Firewall (UFW)

Garanta que as portas necessárias estejam abertas:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Pronto! Acesse no navegador:
👉 **`https://peccapsai.mentoriajrs.com`**

---

## 🔄 Como Atualizar a Aplicação Futuramente

Sempre que fizer alterações no código e enviar para o GitHub, basta entrar na VPS e rodar o script automático de deploy:
```bash
cd /var/www/esus-pec-ai
bash deploy.sh
```
O script fará o `git pull`, `npm install`, `npm run build` e reiniciará o app no PM2 sem interrupção!
