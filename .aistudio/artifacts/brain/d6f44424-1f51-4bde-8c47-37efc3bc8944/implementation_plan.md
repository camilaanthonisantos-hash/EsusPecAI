# Plano de Implementação: Painel de Chamada em Tempo Real (Smart TV & Múltiplos Dispositivos)

Ajuste e aprimoramento completo do Painel de Chamada da Fila de Atendimento para que, quando um profissional de saúde clicar na ação **"Chamar no Painel (TV)"** na lista da recepção ou no modal de chamada, o painel exibido em outros equipamentos (Smart TV, monitores de sala de espera ou abas dedicadas `/?painel=chamada`) reaja instantaneamente com o destaque visual em tela cheia do paciente chamado, alerta sonoro de hospital e síntese de voz (TTS - Text-To-Speech) em português.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> A funcionalidade utilizará uma arquitetura de sincronização tripla em tempo real (Supabase Realtime PostgreSQL + Web API BroadcastChannel + LocalStorage Event Listener) para garantir **latência zero (<10ms entre abas e <200ms entre dispositivos na rede)** sem perda de dados cadastrais do paciente.

- **Integridade dos Dados na Chamada**: Garantia de que a alteração de status para `calling` realize a fusão (*deep merge*) dos atributos do paciente (`patientName`, `professionalName`, `professionalProfession`, `riskClassification`, `scheduledDate`), impedindo que objetos parciais cheguem à Smart TV.
- **Notificação Sonora & Voz na Smart TV**: Execução automática do carrilhão hospitalar (*D5 -> A5*) e do anúncio em síntese de voz em 3 ciclos com contagem regressiva, seguido da atualização do status para em atendimento.
- **Resiliência a Políticas de Autoplay de Áudio**: Banner interativo de autorização de som caso o navegador da Smart TV bloqueie a reprodução sem interação inicial do usuário.

---

### 1. Visão Geral & Conceito Principal

- **O que faz**: Habilita o envio e a exibição em tempo real das chamadas de pacientes para qualquer tela de Smart TV ou monitor da sala de espera conectado ao endereço do painel (`/?painel=chamada`).
- **Público-Alvo**: Recepção, triagem, equipes multiprofissionais, médicos e cidadãos na sala de espera do posto de saúde ou CAPS.
- **Valor Agregado**: Elimina a necessidade de chamadas manuais ou falhas de comunicação, garante conformidade com as diretrizes de acessibilidade e regulação do SUS e proporciona uma experiência fluida para unidades de saúde.

---

### 2. Fluxo do Usuário & Design Visual

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PAINEL DE RECEPÇÃO / CONSULTÓRIO                      │
│   Profissional Clica em "Chamar no Painel (TV)" / CallPatientModal          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
                    ▼                                     ▼
      ┌───────────────────────────┐         ┌───────────────────────────┐
      │  Supabase & Server Database│         │ Web API BroadcastChannel  │
      │  updateQueueItemStatus    │         │ & LocalStorage Event Sync │
      └─────────────┬─────────────┘         └─────────────┬─────────────┘
                    │                                     │
                    └──────────────────┬──────────────────┘
                                       │ Sincronização Instantânea
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TELA DE CHAMADA DA TV / SALA DE ESPERA                 │
│                      PublicQueueCallScreen (/?painel=chamada)               │
│                                                                             │
│   1. Destaque Visual em Tela Cheia (Nome, Profissional, Risco, Idade)       │
│   2. Som de Alerta Hospitalar + Anúncio de Voz (TTS pt-BR)                 │
│   3. Loop de 3 Ciclos com Contagem Regressiva                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Fluxo do Profissional**:
  1. No painel da Recepção / Fila de Atendimento, o profissional escolhe a ação **"Chamar no Painel (TV)"** na lista do paciente.
  2. O status do paciente transita para `calling` e dispara o sinal instantâneo de chamada em tempo real.
- **Fluxo da Smart TV / Tela de Espera (`/?painel=chamada`)**:
  1. O painel capta a chamada via canal em tempo real.
  2. A animação da lista é interrompida suavemente e exibe o **Spotlight de Chamada** em destaque centralizado com fundo escuro e bordas verdes pulsantes.
  3. Toca o carrilhão hospitalar (*D5 -> A5*) e a voz sintetizada anuncia: *"Atenção: [Nome do Paciente], favor dirigir-se ao consultório de [Nome do Profissional]"*.
  4. O painel executa 3 repetições cronometradas do anúncio e, após a conclusão, redireciona o status para em atendimento.

---

### 3. Decisões do Produto & Estratégia Técnica

- **Estratégia Tripla de Transmissão**:
  - *Supabase Realtime Postgres Changes*: Sincronização entre diferentes dispositivos e redes.
  - *Web BroadcastChannel (`pec_queue_call_channel`)*: Comunicação instantânea (<10ms) entre abas e monitores no mesmo computador.
  - *LocalStorage Storage Event*: Fallback nativo para Smart TVs e navegadores em modo kiosk.
- **Fusão de Objetos no Banco (`apiDbSave`)**:
  - Ajuste no envio de atualizações parciais do status da fila para buscar e integrar os dados cadastrais completos antes de gravar no Supabase/Servidor.

---

### 4. Plano de Alterações em Arquivos

1. **`src/services/firebase.ts`**:
   - Corrigir `updateQueueItemStatusInFirestore` para mesclar (*merge*) os dados completos do item existente com o novo status (`calling`), garantindo que `patientName` e `professionalName` sejam mantidos no `raw_data` do Supabase.
2. **`src/components/ReceptionQueueView.tsx`**:
   - Atualizar `handleCall` para emitir mensagem instantânea via `BroadcastChannel` e evento de `localStorage` imediatamente ao acionar o botão "Chamar".
3. **`src/components/PublicQueueCallScreen.tsx`**:
   - Adicionar receptores para o `BroadcastChannel` e eventos de `storage` para reação imediata na tela do painel.
   - Tratar a inicialização do contexto de áudio em Smart TVs.
4. **`src/components/CallPatientModal.tsx`**:
   - Garantir que a ação de rechamar no modal retransmita o evento para o painel da TV.

---

### 5. Passos de Verificação do Resultado

1. Executar `compile_applet` para confirmar a ausência de erros de build e TypeScript.
2. Abrir o sistema em duas janelas (uma com a Fila de Atendimento e outra em `/?painel=chamada`).
3. Clicar em "Chamar no Painel (TV)" para um paciente e verificar se o painel da TV responde instantaneamente ativando a chamada visual e sonora.
