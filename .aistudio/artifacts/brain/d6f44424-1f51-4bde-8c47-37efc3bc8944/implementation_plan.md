# Plano de Integração e Ajuste de Interface: Gerador PEC e Gravação no Banco de Dados 2

Este documento detalha o funcionamento exato no **Frontend** do Gerador PEC ao alternar entre **Atendimento Individual** e **Ação Coletiva (BPA-C)**, respondendo como a tela se comporta quando o profissional escolhe um procedimento coletivo, além do mapeamento completo dos 14 procedimentos do **CAPS I (CNES 7676417)** e o esclarecimento sobre o **CID-10**.

---

> [!IMPORTANT]
> **Esclarecimento sobre o Diagnóstico CID-10:**  
> **Esses dados já são informados no atendimento hoje?**  
> No App 1 atualmente, a evolução clínica gera o texto da Avaliação (SOAP) onde a IA ou o profissional cita hipóteses no texto livre, mas **não existiam dois campos específicos e separados para "CID-10 Principal" e "CID-10 Secundário"**.  
> Para alimentar corretamente a tabela `raas_psychosocial` do Banco 2 (que possui as colunas `cid_primary` e `cid_secondary`), adicionaremos na tela de atendimento individual esses dois campos estruturados com busca inteligente e auto-sugestão pela IA com base no relato clínico.

---

## 1. Como Funcionará no Frontend ao Clicar em "Ação Coletiva" e Escolher o Procedimento

Quando o profissional está no **Componente 1 (Gerador PEC)**, a interface terá dois modos claramente distintos acionados pelos botões no topo:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ COMPONENTE 1: GERADOR PEC                                                              │
│                                                                                        │
│ [ 👤 Atendimento Individual ]        [ 👥 Ações Coletivas (BPA-C) ] ★ ATIVO            │
│  (1 cidadão / BPA-I e RAAS)           (Grupo, Oficina, Matriciamento / BPA-C)          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ELEMENTO 2: SELETOR DE PROCEDIMENTO COLETIVO (BPA-C)                                   │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ 🔍 [03.01.08.014-3] Atendimento em Oficina Terapêutica I                           ▼│ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│ [TELA SE ADAPTA DINAMICAMENTE PARA A AÇÃO COLETIVA]:                                  │
│                                                                                        │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ 📌 DETALHES DA AÇÃO COLETIVA - CAPS I (CNES: 7676417)                              │ │
│ │                                                                                    │ │
│ │  📅 Data da Atividade:        👨‍⚕️ CBO do Executor:        👥 Total de Participantes:│ │
│ │  [ 13/10/2026           ]    [ 2515-10 - Psicólogo  ▼]    [  -  |  8  |  +  ]      │ │
│ │                                                                                    │ │
│ │  📝 Tema / Objetivo da Atividade Coletiva:                                         │ │
│ │  [ Oficina de Expressão Artística e Ressignificação dos Vínculos                 ] │ │
│ │                                                                                    │ │
│ │  🎙️ Relato Técnico / Memória da Atividade (Texto ou Voz):                          │ │
│ │  [ Usuários participaram ativamente da confecção dos trabalhos manuais, havendo    ] │ │
│ │  [ boa integração grupal, compartilhamento de vivências e estabilização do humor.  ] │ │
│ │                                                                                    │ │
│ │  ✨ [ Gerar Relatório Técnico com IA ]  📋 [ Copiar Ata da Atividade ]             │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                        │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ 📊 RESUMO DO REGISTRO BPA-C:                                                        │ │
│ │ • Competência: Outubro / 2026                                                      │ │
│ │ • Procedimento: 03.01.08.014-3 - Atendimento em Oficina Terapêutica I             │ │
│ │ • Quantidade a somar no lote: +8 atendimentos                                      │ │
│ │                                                                                    │ │
│ │ [ 💾 GRAVAR PRODUÇÃO NO BPA-C (BANCO DE DADOS 2) ]                                 │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### O que acontece passo a passo no Frontend:

1. **Clique no botão "👥 Ações Coletivas (BPA-C)":**
   - O Elemento 2 substitui a lista de pacientes pela lista suspensa dos **14 Procedimentos Coletivos do CAPS I**.
   - O formulário central deixa de exigir dados individuais de paciente (como CPF, CNS ou nome do cidadão) e passa a exibir o painel específico de **Ação Coletiva**.

2. **Ao escolher o Procedimento no Elemento 2:**
   - O sistema exibe um card com o código SIGTAP, o nome do procedimento e as regras daquele procedimento no CAPS I.
   - O campo **CBO do Executor** é preenchido automaticamente com o CBO do profissional logado (com opção de troca caso seja um profissional com múltiplos CBOs).

3. **Preenchimento dos Campos da Ação Coletiva:**
   - **Data da Atividade:** Preenchida por padrão com a data atual.
   - **Número de Participantes (Quantidade):** Campo numérico com botões rápidos `[ - ] [ + ]` e digitação direta. Esse número é a quantidade exata de atendimentos que será somada no lote BPA-C.
   - **Tema da Oficina / Ação:** Breve identificador da atividade (ex: *Oficina Terapêutica*, *Roda de Conversa*, *Reunião de Matriciamento com UBS X*).
   - **Relato / Memória da Atividade:** Campo de anotações com suporte a microfone (áudio) e texto livre. Um botão opcional de IA permite formatar uma ata ou relatório técnico da atividade para o arquivo do CAPS.

4. **Ao Clicar em "Gravar Produção no BPA-C":**
   - O sistema envia a requisição para o **Banco de Dados 2**:
     - Localiza o lote `bpa_consolidated` da competência atual (ex: `Outubro / 2026`) com CNES `7676417`. Se ainda não existir, cria o cabeçalho do lote.
     - Localiza o item em `bpa_consolidated_items` para aquele `procedure_code` + `cbo`. Se já existir, incrementa `quantity = quantity + participantes`; se não existir, cria o item com `quantity = participantes`.
     - Atualiza o `total_quantity` no lote consolidado.
   - O frontend exibe uma notificação verde de sucesso:
     > *"✅ Ação Coletiva registrada com sucesso! +8 atendimentos somados ao lote BPA-C de Outubro/2026."*

---

## 2. Comparativo: Atendimento Individual vs. Ação Coletiva

| Aspecto | 👤 Atendimento Individual | 👥 Ação Coletiva (BPA-C) |
| :--- | :--- | :--- |
| **Elemento 2 (Lista)** | Lista de Cidadãos / Pacientes cadastrados | Apenas os 14 procedimentos coletivos do CAPS I |
| **Identificação do Paciente** | Obrigatória (Nome, CNS/CPF do paciente) | **Não se aplica** (ação em grupo ou intersetorial) |
| **Foco do Registro** | Consulta clínica individual (SOAP, CID-10, Plano) | Memória da atividade, tema e número de participantes |
| **Diagnóstico (CID-10)** | Campos estruturados (CID Principal e Secundário) | Não aplicável no BPA-C |
| **Destino no Banco 2** | `procedure_production` (BPA-I) ou `raas_psychosocial` (RAAS) | `bpa_consolidated` e `bpa_consolidated_items` |
| **Status da Produção** | `Finalizado` | `Finalizado` |
| **CNES da Unidade** | `7676417` (CAPS I) | `7676417` (CAPS I) |

---

## 3. Catálogo dos 14 Procedimentos Coletivos (BPA-C) para o CAPS I

Estes são os únicos procedimentos listados no modo **Ações Coletivas**:

| Código SIGTAP | Nome do Procedimento | Instrumento | CBOs Principais |
| :--- | :--- | :---: | :--- |
| **03.01.08.025-9** | Ações de Articulação de Redes Intra e Intersetoriais | **BPA-C** | Equipe Multiprofissional do CAPS I |
| **03.01.08.026-7** | Fortalecimento do Protagonismo de Usuários e Familiares | **BPA-C** | Psicólogo, Assistente Social, Pedagogo, Téc. Enfermagem, Artesão |
| **03.01.08.030-5** | Matriciamento de Equipes da Atenção Básica | **BPA-C** | Médicos, Psicólogo, Assistente Social, Enfermeiro, TO, Fonoaudiólogo |
| **03.01.08.039-9** | Matriciamento de Urgência/Emergência e Hospitalar | **BPA-C** | Médicos, Enfermeiro, Psicólogo, Assistente Social, TO |
| **03.01.08.031-3** | Ações de Redução de Danos | **BPA-C** | Médicos, Psicólogo, Assistente Social, Enfermeiro, TO, Pedagogo, Téc. Enfermagem |
| **03.01.08.032-1** | Acompanhamento de Serviço Residencial Terapêutico (SRT) | **BPA-C** | Enfermeiro, Psicólogo, Assistente Social, Médicos, TO, Téc. Enfermagem |
| **03.01.08.033-0** | Apoio a Serviço Residencial Transitório (CT) | **BPA-C** | Equipe Multiprofissional do CAPS I |
| **01.01.01.002-8** | Atividade Educativa / Orientação em Grupo | **BPA-C** | Profissionais de nível superior da equipe |
| **01.01.03.002-9** | Visita Domiciliar / Institucional por Nível Superior | **BPA-C** | Profissionais de nível superior da equipe |
| **03.01.04.003-6** | Terapia em Grupo | **BPA-C** | Psicólogo, Assistente Social, Médico Psiquiatra, TO |
| **03.01.08.014-3** | Atendimento em Oficina Terapêutica I | **BPA-C** | Profissionais de nível médio e técnico |
| **03.01.08.015-1** | Atendimento em Oficina Terapêutica II | **BPA-C** | Profissionais de nível superior |
| **03.01.05.013-9** | Busca Ativa | **BPA-C** | Enfermeiro, Psicólogo, Assistente Social, Médico, TO, Téc. Enfermagem |
| **03.01.10.001-2** | Administração de Medicamentos na Atenção Especializada | **BPA-C** | Enfermeiro, Técnico de Enfermagem, Auxiliar de Enfermagem |

---

## 4. Roteiro de Implementação

1. **Fase 1: Dados e Procedimentos (`src/data/capsProcedures.ts`)**
   - Registrar formalmente os 14 procedimentos do BPA-C com seus metadados, regras e CBOs compatíveis.
2. **Fase 2: Alternador de Modalidade e Interface Dinâmica (`App.tsx` e `PatientDropdownSelector.tsx`)**
   - Criar os botões alternadores `[ 👤 Atendimento Individual ]` e `[ 👥 Ações Coletivas (BPA-C) ]` acima do Elemento 2.
   - No modo Individual: manter fluxo de cidadãos e adicionar campos de CID Principal e Secundário.
   - No modo Coletivo: listar os 14 procedimentos no Elemento 2 com busca instantânea e renderizar o painel de Ação Coletiva (Data, CBO, Quantidade de Participantes, Tema e Ata).
3. **Fase 3: Serviços de Persistência no Banco de Dados 2 (`secondarySupabase.ts`)**
   - Gravação agregada do BPA-C: busca ou criação do lote mensal com CNES `7676417`, soma de `quantity` no item correspondente e atualização do total.
   - Gravação individual do BPA-I e RAAS com status `Finalizado` e CNES `7676417`.
4. **Fase 4: Verificação de Build e Teste**
   - Executar `compile_applet` e validar visualmente a alternância fluida entre Individual e Coletivo.
