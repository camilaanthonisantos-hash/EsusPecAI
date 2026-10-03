# 🐳 Deploy do e-SUS PEC AI no Portainer com Traefik

Guia passo a passo configurado para sua VPS Contabo (Ubuntu 20.04) com **Traefik**, **leresolver** e rede **`n8n-default-network`**.

---

## 🚀 Passo a Passo no Portainer

### 1. Criar a Stack no Portainer
1. No menu lateral do **Portainer**, clique em **Stacks**.
2. Clique no botão **+ Add stack**.
3. **Name:** `esus-pec`
4. Em **Build method**, você tem duas opções:

#### Opção A: Via Repositório Git (Recomendado)
- Selecione **Repository**.
- **Repository URL:** `https://github.com/camilaanthonisantos-hash/EsusPecAI.git`
- **Repository reference:** `refs/heads/main`
- **Compose path:** `docker-compose.yml`

#### Opção B: Via Web Editor (Direto no Navegador)
- Selecione **Web editor** e cole o conteúdo de `docker-compose.yml`.

---

### 2. Definir as Variáveis de Ambiente no Portainer
Abaixo do editor (na seção **Environment variables**), clique em **+ Add environment variable** e adicione:

| Nome da Variável | Valor |
|---|---|
| `GEMINI_API_KEY` | *Sua chave da API do Google Gemini* |
| `OPENROUTER_API_KEY` | *Sua chave do OpenRouter (sk-or-v1-...)* |
| `OPENAI_API_KEY` | *(Opcional)* |
| `GROQ_API_KEY` | *(Opcional)* |

---

### 3. Fazer o Deploy
1. Clique no botão **Deploy the stack**.
2. O Portainer irá:
   - Baixar o código e compilar a imagem Docker;
   - Conectar o container na rede `n8n-default-network`;
   - Registrar no **Traefik** as rotas de `peccapsai.mentoriajrs.com`;
   - O **Traefik** emitirá o certificado SSL automaticamente através do `leresolver` (Let's Encrypt).

---

### 4. Acessar a Aplicação
Após 1 a 2 minutos para compilação e emissão do SSL:
👉 **`https://peccapsai.mentoriajrs.com`**

---

### 🔄 Como Atualizar a Aplicação Futuramente
Quando você fizer alterações no código:
1. No Portainer, abra a stack `esus-pec`.
2. Clique na aba **Editor** e depois em **Update the stack** (marque a opção *Re-pull image and redeploy*).
3. O app será atualizado sem perder os dados salvos em `data-store`.
