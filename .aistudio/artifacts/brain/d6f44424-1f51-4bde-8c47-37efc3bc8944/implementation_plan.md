# Plano de Gravação e Produção RAAS no Banco de Dados 2

Plano completo de integração e mapeamento de dados do App 1 para as tabelas `public.raas_psychosocial` (admissão/cabeçalho) e `public.raas_psychosocial_items` (ações ambulatoriais) no Supabase Secundário (BD 2).

> [!IMPORTANT]
> **Decisões Confirmadas e Atualizadas pelo Usuário**:
> 1. **Data de Admissão**: Será utilizada estritamente a data de cadastro do paciente no App 1 (`patient.createdAt`), formatada no padrão internacional `AAAA-MM-DD`.
> 2. **Campos Específicos do RAAS no Form de Entrada (Antes do Relato Clínico)**:
>    - **"Usuário de Álcool e / ou outras Drogas?"**: `Não / Não Se Aplica`, `Álcool`, `Crack`, `Outras Drogas`.
>    - **"Em situação de rua?"**: `N - Não`, `S - Sim`.
>    - **"Origem do Usuário"**: `01 - DEMANDA ESPONTANEA`, `02 - ATENCAO BASICA`, `03 - SERVICO DE URGENCIA`, `04 - OUTRO CAPS`, `05 - HOSPITAL DIA`, `06 - HOSPITAL PSIQUIATRICO`.
>    - **"Cobertura ESF"**: `N - Não`, `S - Sim` (ao selecionar Sim, habilita a entrada do **"CNES UBSF"**).
>    - **"Destino Usuário"**: `00 - PERMANENCIA`, `01 - CONTINUIDADE DO ACOMP.EM OUTRO CAPS`, `02 - CONTINUIDADE DO ACOMP.NA ATENCAO BASICA`, `03 - ALTA`, `04 - OBITO`.
> 3. **Reestruturação Visual do Card de Faturamento RAAS (Componente 2)**:
>    - **Item 1 ("Ação")**: Isolado no topo ocupando a linha inteira.
>    - **Itens 2 & 3 ("CID-10 Principal" e "CID-10 Secundário")**: Posicionados logo abaixo da Ação, organizados lado a lado em 2 colunas.
>    - **Item 4**: Removido conforme solicitado.

---

## 1. Origem e Extração dos Dados do App 1 ➔ BD 2

### A. Tabela Principal (`public.raas_psychosocial`)

| Campo na Tela / Regra | Origem no App 1 | Coluna no BD 2 | Formato Salvo | Exemplo |
| :--- | :--- | :--- | :--- | :--- |
| **1. CNES Estabelecimento** | Padrão da Unidade | `establishment_cnes` | TEXT | `'7676417'` |
| **2. CPF / CNS do Paciente** | `patient.cns` ou `patient.cpf` | `patient_cns` | TEXT (15 dígitos) | `'03351126255'` |
| **3. Data de Admissão** | Data de cadastro (`patient.createdAt`) | `admission_date` | DATE (`YYYY-MM-DD`) | `'2026-10-10'` |
| **5. Data de Nascimento** | `patient.birthDate` | `birth_date` | DATE (`YYYY-MM-DD`) | `'1997-05-25'` |
| **Sexo** | `patient.gender` | `gender` | TEXT (`'M'`, `'F'` ou `'O'`) | `'F'` |
| **6. Nome do Paciente** | `patient.fullName` | `patient_name` | TEXT (Caixa alta) | `'CAMILA DOS SANTOS VASCONCELOS'` |
| **8. Situação de Rua?** | Seletor "Em situação de rua?" | `street_situation` | BOOLEAN | `true` ou `false` |
| **9. Usuário Álcool/Drogas?** | Seletor "Usuário Álcool/Drogas?" | `substance_user` | BOOLEAN | `true` ou `false` |
| **10. Origem do Usuário** | Seletor "Origem do Usuário" | `origin_code` | TEXT | `'01 - DEMANDA ESPONTANEA'` |
| **11. CID-10 Principal** | `cidPrimary` da consulta | `cid_primary` | TEXT | `'Z09'` ou `'F32.2'` |
| **CID-10 Secundário** | `cidSecondary` da consulta | `cid_secondary` | TEXT | `'F41.9'` |
| **12. Cobertura ESF** | Seletor "Cobertura ESF" | `esf_coverage` | BOOLEAN | `true` ou `false` |
| **CNES UBSF (Condicional)** | Campo "CNES UBSF" (se Cobertura ESF = Sim) | `esf_cnes_team` | TEXT | `'2408101'` |
| **13. Destino Usuário** | Seletor "Destino Usuário" | `destination_code` | TEXT | `'00 - PERMANENCIA'` |
| **14. Status do Registro** | Conclusão da consulta | `status` | TEXT | `'Finalizado'` |
| **Observações** | Resumo da Avaliação / Plano | `notes` | TEXT | `'HISTÓRICO/EVOLUÇÃO: ...'` |

---

### B. Vinculação da Ação Ambulatorial (`public.raas_psychosocial_items`)

| Campo da Ação | Origem no App 1 | Coluna no BD 2 | Formato Salvo | Exemplo |
| :--- | :--- | :--- | :--- | :--- |
| **Vínculo da Admissão** | ID da Tabela Principal | `raas_id` | UUID | `'uuid-123-abc'` |
| **Ação / Procedimento** | `procedureCode` selecionado | `procedure_code` | TEXT | `'03.01.08.020-8'` |
| **Data da Ação** | Data da consulta (`timestamp`) | `action_date` | DATE (`YYYY-MM-DD`) | `'2026-10-15'` |
| **Quantidade** | Contagem do procedimento | `quantity` | INTEGER | `1` |
| **CNS Profissional** | `currentUser.cns` | `professional_cns` | TEXT (15 dígitos) | `'702101723931195'` |
| **CBO Profissional** | `currentUser.cbo` | `professional_cbo` | TEXT (6 dígitos) | `'223208'` |
| **Local (C/T)** | Seleção na tela (`'C'` ou `'T'`) | `local` | TEXT | `'C'` |

---

## 2. Layout do Card de Faturamento RAAS no OutputCard (Componente 2)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. AÇÃO (Isolado na linha do topo)                          │
│ [ Seletor do Procedimento SIGTAP / Ação Executada ]         │
├──────────────────────────────┬──────────────────────────────┤
│ 2. CID-10 PRINCIPAL          │ 3. CID-10 SECUNDÁRIO        │
│ [ Campo de Entrada CID ]     │ [ Campo de Entrada CID ]     │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 3. Etapas de Execução Técnicas

1. Atualizar o Card de Faturamento RAAS em `OutputCard.tsx`:
   - Mudar label de Procedimento para **"Ação"** e isolá-lo na primeira linha.
   - Colocar **"CID-10 Principal"** e **"CID-10 Secundário"** lado a lado em 2 colunas logo abaixo.
   - Remover itens excedentes.
2. Atualizar o formulário de entrada em `ClinicalNotesForm.tsx` com o bloco de seletores do RAAS.
3. Atualizar a sincronização com BD 2 em `src/services/secondarySupabase.ts`.
4. Testar e validar a gravação no BD 2.
