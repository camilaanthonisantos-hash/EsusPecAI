# Plano de Implementação: Padronização e Layout A4 do Projeto Terapêutico Singular (PTS) para Todas as Profissões

Ajuste e padronização visual e estrutural da ficha de impressão A4 do Projeto Terapêutico Singular (PTS) no sistema e-SUS PEC Multiprofissional (CAPS I Anajás), seguindo rigorosamente o modelo especificado com tabela de dados cadastrais, cabeçalho de diagnósticos e seções organizadas por especialidade profissional.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> O layout do PTS foi configurado para garantia absoluta de impressão em exatamente **1 página A4 Retrato**, utilizando espaçamentos otimizados, limites de conteúdo e estilos CSS de impressão `@media print`.

- **Decisão Confirmada 1 (Títulos das Seções por Profissão)**: Títulos das seções de diagnóstico e condutas adaptados para cada categoria profissional:
  - **Enfermagem**: `DIAGNÓSTICOS DE ENFERMAGEM:` e `INTERVENÇÕES:`
  - **Médico**: `DIAGNÓSTICOS MÉDICOS:` e `CONDUTAS MÉDICAS:`
  - **Psicologia**: `AVALIAÇÃO E DIAGNÓSTICO PSICOSSOCIAL:` e `INTERVENÇÕES PSICOLÓGICAS:`
  - **Serviço Social**: `AVALIAÇÃO SOCIOASSISTENCIAL:` e `INTERVENÇÕES SOCIAIS:`
  - **Demais Profissões (Nutrição, Fisioterapia, Terapia Ocupacional, etc.)**: `AVALIAÇÃO E DIAGNÓSTICO [ESPECIALIDADE]:` e `PLANO TERAPÊUTICO E INTERVENÇÕES:`
- **Decisão Confirmada 2 (Limite de Conteúdo por Seção)**: Máximo de **6 itens numerados** por seção em formato de lista (1., 2., 3., ... 6.), finalizando com ponto final `.` no último item.
- **Padrão Tipográfico & Estilização (Conforme Anotações do Modelo)**:
  - **Tabela de Dados do Paciente**: Texto em verde escuro (`#047857`), tamanho 12px, maiúsculas, com campo `DATA PTS` no formato `DD/MM/AAAA` e menor espaçamento interno.
  - **Título dos Diagnósticos CAPS**: Maiúsculo, azul escuro (`#1e3a8a`), tamanho 12px, negrito (`font-weight: bold`).
  - **Itens de Diagnósticos e Conteúdos**: Negrito, itálico, tamanho 11px (`font-size: 11px; font-weight: bold; font-style: italic`), maiúsculas e minúsculas.
  - **Assinatura e Rodapé Padrão**: Mantidos conforme o modelo oficial pré-determinado na parte inferior do documento.

---

### 1. Visão Geral & Conceito Principal

- **O que faz**: Atualiza o gerador de impressão HTML/A4 do PTS (`src/utils/printPts.ts`) e o modal de edição (`src/components/PtsModal.tsx`) para refletir a nova estrutura de tabela de identificação, títulos dinâmicos por profissão, contagem limite de 6 itens e estilo tipográfico especificado na imagem de referência.
- **Público-Alvo**: Médicos, Enfermeiros, Psicólogos, Assistentes Sociais e demais profissionais de saúde mental do CAPS I.
- **Valor Agregado**: Garante legibilidade, padronização técnica entre especialidades e enquadramento perfeito em folha única A4 sem quebra de página.

---

### 2. Fluxo do Usuário & Design Visual

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             MODAL DE EDIÇÃO DO PTS                          │
│        Preenchimento manual ou Síntese Automática com IA (Gemini API)      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FICHA DE IMPRESSÃO A4 DO PTS (`printPts.ts`)             │
│                                                                             │
│ 1. CABEÇALHO INSTITUCIONAL COM LOGOS (SUS / PREFEITURA DE ANAJÁS)            │
│ 2. TABELA DE IDENTIFICAÇÃO (Verde Escuro #047857, Maiúscula, DD/MM/AAAA)    │
│ 3. TÍTULO DIAGNÓSTICOS CAPS (Azul Escuro #1e3a8a, Negrito, Tam. 12)          │
│ 4. LISTA DE DIAGNÓSTICOS INICIAIS (> CID-10 em Itálico Negrito Tam. 11)    │
│ 5. SEÇÃO 1: DIAGNÓSTICOS [PROFISSÃO] (Máx. 6 itens numerados 1. a 6.)       │
│ 6. SEÇÃO 2: INTERVENÇÕES / CONDUTAS [PROFISSÃO] (Máx. 6 itens numerados)    │
│ 7. ASSINATURAS COMPARTILHADAS (Referência Técnica + Paciente)               │
│ 8. RODAPÉ INSTITUCIONAL PADRÃO                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Seções por Categoria Profissional**:
  - **Médico**: `DIAGNÓSTICOS MÉDICOS:` + `CONDUTAS MÉDICAS:`
  - **Enfermagem**: `DIAGNÓSTICOS DE ENFERMAGEM:` + `INTERVENÇÕES:`
  - **Psicologia**: `AVALIAÇÃO E DIAGNÓSTICO PSICOSSOCIAL:` + `INTERVENÇÕES PSICOLÓGICAS:`
  - **Serviço Social**: `AVALIAÇÃO SOCIOASSISTENCIAL:` + `INTERVENÇÕES SOCIAIS:`
  - **Outros**: `AVALIAÇÃO E DIAGNÓSTICO [ESPECIALIDADE]:` + `PLANO TERAPÊUTICO E INTERVENÇÕES:`

---

### 3. Decisões do Produto & Estratégia Técnica

- **Formatação de Listas Numeradas Limpas**:
  - Processamento dos textos inseridos pelo usuário ou gerados por IA para conversão em listas numeradas limpas (1. ..., 2. ..., até no máximo 6 itens), garantindo ponto final no último item.
- **Strict A4 Single-Page CSS**:
  - `max-height: 297mm; overflow: hidden;` no contêiner da folha.
  - Redução de espaçamentos em margens e padding (`padding: 3px 6px`) na tabela e nas seções.

---

### 4. Plano de Alterações em Arquivos

1. **`src/utils/printPts.ts`**:
   - Reestruturar `generatePtsHtml` para aplicar as cores (#047857 para dados do paciente, #1e3a8a para título de diagnósticos), tamanhos de fonte e tipografia (negrito/itálico).
   - Implementar lógica condicional de títulos de seções por profissão do autor (`docAuthor.profession` / `currentUser.profession`).
   - Formatador helper para quebra em até 6 itens numerados por seção.
2. **`src/components/PtsModal.tsx`**:
   - Ajustar os rótulos dos campos do modal para se adaptarem dinamicamente conforme a profissão do usuário logado (ex: exibindo "Diagnósticos Médicos" para médico, "Diagnósticos de Enfermagem" para enfermagem, etc.).
3. **`server.ts` (`POST /api/gemini/pts`)**:
   - Atualizar a instrução do prompt do Gemini para retornar os itens formatados como lista numerada direta de 1 a no máximo 6 itens por eixo/seção conforme a especialidade profissional.

---

### 5. Passos de Verificação do Resultado

1. Compilar com `compile_applet` para certificar ausência de erros de sintaxe ou tipos.
2. Abrir a emissão de PTS para um paciente selecionado em diferentes perfis profissionais (Médico, Enfermeiro, Psicólogo, Assistente Social).
3. Testar a geração e o botão "Salvar e Imprimir PTS A4".
4. Verificar na visualização de impressão se o documento se mantém em exatamente **1 página A4** com as cores, maiúsculas e formatação especificadas.
