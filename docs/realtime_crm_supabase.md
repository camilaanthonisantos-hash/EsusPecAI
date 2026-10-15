# Guia do CRM em Tempo Real (Supabase Realtime WebSockets)

Este documento descreve como funciona a sincronização instantânea em tempo real do CRM WhatsApp sem necessidade de *polling* (sem ficar consultando o Supabase repetidamente a cada poucos segundos).

---

## 1. Como Funciona

1. **WebSockets Nativos:** A aplicação estabelece uma conexão WebSocket persistente com o motor de Realtime do Supabase.
2. **Postgres Change Data Capture (CDC):** Sempre que o **n8n**, a **Evolution API**, o webhook ou um operador insere ou altera uma linha na tabela `public.whatsapp_messages`, o PostgreSQL gera um evento de replicação.
3. **Entrega Push Instantânea (< 50ms):** O Supabase envia o registro exato (`INSERT`, `UPDATE` ou `DELETE`) via WebSocket para o navegador.
4. **Zero Consultas Adicionais:** A interface React atualiza diretamente os agendamentos, altera o indicador de status ("Respondido"), exibe a última resposta no tooltip e toca uma sutil notificação sonora, sem recarregar e sem consumir requisições do banco.

---

## 2. Ativação no Painel do Supabase (SQL Editor)

Se for recriar a tabela ou configurar uma nova instância, execute o comando abaixo no **SQL Editor** do Supabase:

```sql
-- 1. Garante que a tabela tenha REPLICA IDENTITY FULL para enviar o registro completo nos eventos
ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;

-- 2. Adiciona a tabela à publicação do Realtime do Supabase
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'whatsapp_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
  END IF;
END $$;
```

---

## 3. Estrutura do Registro para Disparo via n8n / Webhook

Ao receber uma mensagem do paciente (ex.: retorno via webhook da Evolution API no n8n), o n8n pode fazer um `INSERT` direto no Supabase na tabela `whatsapp_messages`:

```json
{
  "id": "msg_{{ $now.toMillis() }}",
  "appointment_id": "queue-1791575126897-7v3a",
  "patient_phone": "5591985958042",
  "patient_name": "Nome do Paciente",
  "direction": "inbound",
  "sender_type": "patient",
  "sender_name": "Nome do Paciente",
  "message_text": "Confirmado, estarei presente!",
  "message_type": "text",
  "status": "replied",
  "created_at": {{ $now.toMillis() }}
}
```

Assim que essa linha for gravada no Supabase, todos os operadores logados no sistema visualizarão a mensagem no CRM imediatamente na mesma fração de segundo.
