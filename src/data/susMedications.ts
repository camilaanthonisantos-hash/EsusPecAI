import { SUSMedication } from '../types';
import { CARDIO_GENO_MEDICATIONS } from './medsCardioGeno';
import { INFECTO_NEURO_MEDICATIONS } from './medsInfectoNeuro';
import { METAB_RESP_DERM_OTHER_MEDICATIONS } from './medsMetabRespDermOther';

/**
 * Catálogo Oficial Consolidado de Medicamentos do SUS / RENAME 2022
 * Organizado e catalogado com Código ATC e Classes Anatômicas Terapêuticas:
 * - A: Aparelho digestivo e metabolismo
 * - B: Sangue e órgãos hematopoéticos
 * - C: Aparelho cardiovascular
 * - D: Medicamentos dermatológicos
 * - G: Aparelho geniturinário e hormônios sexuais
 * - H: Preparações hormonais sistêmicas
 * - J: Anti-infecciosos para uso sistêmico (AWaRe)
 * - L: Agentes antineoplásicos e imunomoduladores
 * - M: Sistema musculoesquelético
 * - N: Sistema nervoso (RAPS / Portaria 344)
 * - P: Produtos antiparasitários, inseticidas e repelentes
 * - R: Aparelho respiratório
 * - S: Órgãos sensitivos (Oftalmologia / Otologia)
 * - V: Vários e Insumos
 * - H*: Fitoterápicos (Farmacopeia Brasileira)
 */
export const OFFICIAL_SUS_MEDICATIONS: SUSMedication[] = [
  ...CARDIO_GENO_MEDICATIONS,
  ...INFECTO_NEURO_MEDICATIONS,
  ...METAB_RESP_DERM_OTHER_MEDICATIONS,
];
