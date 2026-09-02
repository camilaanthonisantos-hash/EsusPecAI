# Guia de Configuração: n8n + Firebase Firestore (Confirmação de Pagamento PIX)

Este guia orienta passo a passo como configurar o n8n para atualizar o status da assinatura do usuário no Firebase Firestore assim que o pagamento PIX for confirmado no PagBank.

---

## 1. Identificação do Projeto Firebase
- **Project ID:** `vocal-shuttle-g8chg`
- **Firestore Database ID:** `ai-studio-pronturiopecmult-d6f44424-1f51-4bde-8c47-37efc3bc8944`

---

## 2. Link Direto para Gerar a Chave de Serviço (Service Account)
Acesse diretamente o link do console do Firebase:
👉 **[Console Firebase - Gerar Chave Privada](https://console.firebase.google.com/project/vocal-shuttle-g8chg/settings/serviceaccounts/adminsdk)**

1. Na seção **Admin SDK do Firebase**, clique no botão **"Gerar nova chave privada"** (Generate new private key).
2. Confirme o download do arquivo `.json` para o seu computador.

---

## 3. Configuração da Credencial no n8n

1. Acesse o seu painel do n8n.
2. No menu lateral, vá em **Credentials** > **Add Credential** (ou Nova Credencial).
3. Pesquise por: **Google Cloud Service Account** (ou **Google OAuth2 API**).
4. Abra o arquivo `.json` baixado e preencha:
   - **Service Account Email / Client Email:** copie o valor de `client_email`
   - **Private Key:** copie todo o conteúdo de `private_key` (incluindo `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`)
   - **Scopes:** 
     ```text
     https://www.googleapis.com/auth/datastore
     ```
5. Clique em **Save** e nomeie a credencial como `Firebase Service Account`.

---

## 4. Configuração do Nó "HTTP Request" no Fluxo n8n

No fluxo do arquivo `confirmar_pagamento_pix.md`, localize o nó que anteriormente apontava para o Supabase e configure da seguinte forma:

- **Method:** `PATCH`
- **URL:**
  ```text
  https://firestore.googleapis.com/v1/projects/vocal-shuttle-g8chg/databases/ai-studio-pronturiopecmult-d6f44424-1f51-4bde-8c47-37efc3bc8944/documents/users/{{ $json.body.reference_id }}?updateMask.fieldPaths=subscription_status&updateMask.fieldPaths=subscription_expires_at&updateMask.fieldPaths=plan_name
  ```
  *(Nota: O `reference_id` enviado na criação do Pix deve ser o `userId` ou identificador do usuário)*

- **Authentication:** `Predefined Credential Type`
- **Credential Type:** `Google Cloud Service Account`
- **Credential:** `Firebase Service Account`
- **Send Headers:** Não precisa de headers manuais adicionais (a credencial gera o Bearer Token automaticamente).
- **Send Body:** `true`
- **Body Content Type:** `JSON`
- **Specify Body:** `Using JSON`
- **JSON:**
  ```json
  {
    "fields": {
      "subscription_status": {
        "stringValue": "pago"
      },
      "plan_name": {
        "stringValue": "={{ $json.body.plan_name || 'mensal' }}"
      },
      "subscription_expires_at": {
        "integerValue": "={{ $now.plus({ days: $json.body.duration_days || 30 }).toMillis() }}"
      }
    }
  }
  ```

---

## 5. Como Funciona a Expiração e Fuso Horário
O campo `subscription_expires_at` é gravado como timestamp em milissegundos (UTC). 
No aplicativo, a comparação é feita com o horário de Brasília (`America/Sao_Paulo`), garantindo que o acesso permaneça liberado até o último minuto contratado.
