# Plano de Implementação: Organização da Fila & Seleção Dinâmica de Horários por Grade Profissional

Adequar a ordenação da Fila de Atendimento por data, hora e minuto (ordem cronológica) e restringir a seleção de horários nos agendamentos/adicição à fila apenas aos horários configurados na Gestão de Agenda de cada profissional, ocultando automaticamente os horários já ocupados.

## Decisões Confirmadas do Usuário

- **Exibição de Horários Ocupados**: Horários já agendados ou presentes na fila para o profissional no dia selecionado serão **totalmente ocultados** da listagem de seleção.
- **Ordenação da Fila**: Fila ordenada cronologicamente por **data e horário agendado (data, hora, minuto)**, preservando a reordenação manual (drag-and-drop) via `orderIndex`.
- **Grade Padrão de Fallback**: Caso o profissional não tenha configurado uma grade semanal customizada para determinado dia da semana, o sistema carrega a grade padrão da profissão/sistema com intervalos de 15 a 30 min.

---

## 1. Visão Geral & Conceito Core

1. **Fila de Atendimento Organizada Cronologicamente**:
   - A ordenação base da fila reflete fielmente a data e horário agendado de cada paciente (`scheduledDate` + `scheduledTime`), garantindo que a sequência (1º, 2º, 3º...) acompanhe os horários em ordem (ex: 19/10 08:00 antes de 19/10 08:20 e 20/10 08:00).
   - Pacientes adicionados manualmente ou reordenados por drag & drop continuam com suporte ao `orderIndex` sem perder a consistência de data/hora.

2. **Seleção Dinâmica de Horários Disponíveis**:
   - Ao abrir o modal "Adicionar à Fila" (`AddToQueueModal`) ou criar agendamentos (`AppointmentsManagementView`, `PublicBookingPortal`), o sistema consulta a grade do profissional selecionado (`user.scheduleConfig.weeklySchedule`).
   - Calcula os horários da grade para o dia da semana específico (0=Domingo, 1=Segunda, ..., 6=Sábado).
   - Cruza a grade do profissional com todos os agendamentos e itens de fila já existentes para aquele profissional naquela data.
   - Remove da lista qualquer horário que já esteja ocupado.

---

## 2. Experiência do Usuário & Fluxo Visual

1. **Modal Adicionar à Fila / Agendamento**:
   - Seleção de Profissional -> Atualização da Data -> Carregamento instantâneo dos chips/pills de horários disponíveis.
   - Apenas os horários vagos pertencentes à grade configurada daquele profissional (ex: 15:00, 15:15, 15:30...) são exibidos para escolha.
   - Caso todos os horários do dia estejam ocupados, exibe uma mensagem informativa e limpa a seleção.

2. **Fila de Atendimento (`ReceptionQueueView`)**:
   - Exibição sequencial 1º, 2º, 3º... rigidamente alinhada ao horário agendado de atendimento.
   - Indicadores visuais claros de data e horário (ex: `19/10/26 [Segunda-feira] às 08:00`).

---

## 3. Arquitetura Técnica & Componentes

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Dados de Profissionais                          │
│               (user.scheduleConfig / DEFAULT_WEEKLY_SCHEDULE)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Helper: getAvailableSlotsForProfessional             │
│   (Filtra grade do dia da semana e remove horários ocupados na data)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
          ┌─────────────────────────┴────────────────────────┐
          ▼                                                  ▼
┌───────────────────────────────────┐      ┌─────────────────────────────┐
│       AddToQueueModal.tsx         │      │ AppointmentsManagementView  │
│  Chips dinâmicos de horários      │      │ Seletor de horários livres  │
│  livres para a data escolhida     │      │ sem duplicidade             │
└───────────────────────────────────┘      └─────────────────────────────┘

                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      ReceptionQueueView.tsx                            │
│  Ordenação getItemOrderValue(item):                                    │
│  1. orderIndex (se reordenado manualmente)                             │
│  2. timestamp exato de (scheduledDate + scheduledTime)                 │
└────────────────────────────────────────────────────────────────────────┘
```

### Componentes Chave Envolvidos
1. `src/utils/dateCalculator.ts` ou novo helper `src/utils/scheduleHelper.ts`:
   - Função utilitária para extrair os horários disponíveis de um profissional em determinada data, filtrando ocupações na fila (`queueItems`) e na agenda (`appointments`).
2. `src/components/AddToQueueModal.tsx`:
   - Substituir os `quickSlots` estáticos pelo seletor dinâmico baseado na grade do profissional e disponibilidade na data.
3. `src/components/AppointmentsManagementView.tsx`:
   - Aplicar a mesma restrição de horários disponíveis ao realizar novos agendamentos na visão de agenda.
4. `src/components/ReceptionQueueView.tsx`:
   - Refinar `getItemOrderValue` para calcular o valor de ordenação usando a combinação exata de `scheduledDate` + `scheduledTime` (ou `timestamp` ajustado), permitindo que os pacientes sejam ordenados no ranking 1º, 2º, 3º de forma rigorosamente cronológica por data/hora/minuto.
