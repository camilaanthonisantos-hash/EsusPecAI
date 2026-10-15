import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Printer,
  Save,
  Plus,
  Trash2,
  Edit3,
  FileText,
  Building2,
  Calendar,
  UserCheck,
  Sparkles,
  Eye,
  Settings,
  Pill,
  Loader2,
  Check,
} from 'lucide-react';
import {
  PrescriptionData,
  PrescriptionType,
  AdministrationRoute,
  PrescribedMedicationItem,
  Patient,
  User as UserModel,
  Consultation,
  SUSMedication,
} from '../types';
import { PrescriptionPrintSheet, PrescriptionSingleVia } from './PrescriptionPrintSheet';
import { calculateChronologicalAge } from '../utils/dateCalculator';
import { openPrescriptionInNewTab } from '../utils/printPrescription';
import { LOGO_CAPS_BASE64 } from '../constants/assets';
import { MedicationSelector } from './MedicationSelector';

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: Patient | null;
  currentUser: UserModel;
  initialConsultation?: Consultation | null;
  existingPrescription?: PrescriptionData | null;
  onSavePrescription: (prescription: PrescriptionData, consultationId?: string) => Promise<void> | void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  initialConsultationPlanText?: string;
  consultationPlanText?: string;
  medications?: SUSMedication[];
  onSaveNewMedicationToDb?: (med: SUSMedication) => Promise<void> | void;
}

const ADMINISTRATION_ROUTES: AdministrationRoute[] = [
  'USO ORAL',
  'USO IV',
  'USO IM',
  'USO SUBLINGUAL',
  'USO TÓPICO',
  'USO ID',
  'USO INALATÓRIO',
  'USO OFTÁLMICO',
  'USO OTOLÓGICO',
  'USO RETAL',
  'USO NASAL',
  'USO VAGINAL',
];

const COMMON_APS_MEDICATIONS = [
  { name: 'SULFATO FERROSO 40MG – 30CP', route: 'USO ORAL', posology: 'TOMAR 1CP 12/12h', duration: 'DURANTE 15 DIAS', schedule: '7h – 19h' },
  { name: 'VITAMINA C 500MG – 01CX', route: 'USO ORAL', posology: '1CP AO DIA', duration: 'DURANTE 10 DIAS', schedule: 'MANHÃ' },
  { name: 'DIPIRONA SÓDICA 500MG – 20CP', route: 'USO ORAL', posology: 'TOMAR 1CP DE 6/6h SE DOR OU FEBRE', duration: 'DURANTE 3 DIAS', schedule: 'SE NECESSÁRIO' },
  { name: 'PARACETAMOL 750MG – 20CP', route: 'USO ORAL', posology: 'TOMAR 1CP DE 8/8h SE DOR OU FEBRE', duration: 'DURANTE 3 DIAS', schedule: 'SE NECESSÁRIO' },
  { name: 'AMOXICILINA 500MG – 21CAP', route: 'USO ORAL', posology: 'TOMAR 1 CÁPSULA DE 8/8h', duration: 'DURANTE 7 DIAS', schedule: '6h – 14h – 22h' },
  { name: 'LOSARTANA POTÁSSICA 50MG – 60CP', route: 'USO ORAL', posology: 'TOMAR 1CP PELA MANHÃ', duration: 'USO CONTÍNUO', schedule: 'MANHÃ' },
  { name: 'METFORMINA 850MG – 60CP', route: 'USO ORAL', posology: 'TOMAR 1CP APÓS O ALMOÇO E JANTAR', duration: 'USO CONTÍNUO', schedule: '12h – 20h' },
  { name: 'OMEPRAZOL 20MG – 30CAP', route: 'USO ORAL', posology: 'TOMAR 1 CÁPSULA EM JEJUM', duration: 'DURANTE 30 DIAS', schedule: 'EM JEJUM (PELA MANHÃ)' },
  { name: 'DEXAMETASONA 4MG/ML – 01 AMPOLA', route: 'USO IM', posology: 'APLICAR 1 AMPOLA IM EM DOSE ÚNICA', duration: 'DOSE ÚNICA', schedule: 'IMEDIATO' },
  { name: 'NEOMICINA + BACITRACINA POMADA – 01TB', route: 'USO TÓPICO', posology: 'APLICAR NA LESÃO 2 A 3 VEZES AO DIA', duration: 'DURANTE 7 DIAS', schedule: 'APÓS HIGIENIZAÇÃO' },
  { name: 'SALBUTAMOL 100MCG SPRAY – 01 FRASCO', route: 'USO INALATÓRIO', posology: '2 JATOS SE CRISE DE FALTA DE AR', duration: 'CONFORME NECESSIDADE', schedule: 'COM ESPAÇADOR' },
];

export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  isOpen,
  onClose,
  patient,
  currentUser,
  initialConsultation,
  existingPrescription,
  onSavePrescription,
  onShowToast,
  initialConsultationPlanText,
  consultationPlanText,
  medications,
  onSaveNewMedicationToDb,
}) => {
  // Format date in Portuguese: "Anajás, 05 de setembro de 2026"
  // Vincula a data da prescrição exatamente à data do atendimento correspondente
  const getInitialDate = (targetConsultation?: Consultation | null) => {
    let d = new Date();
    if (targetConsultation?.timestamp) {
      d = new Date(targetConsultation.timestamp);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('pt-BR', { month: 'long' });
    const year = d.getFullYear();
    return `Anajás, ${day} de ${month} de ${year}`;
  };

  // Calculate patient's age in format "49A"
  const getPatientAgeFormatted = (): string => {
    if (!patient?.birthDate) return '49A';
    try {
      const calc = calculateChronologicalAge(patient.birthDate);
      return `${calc.years}A`;
    } catch {
      return '--';
    }
  };

  // Form State
  const [type, setType] = useState<PrescriptionType>('PRESCRIÇÃO');
  const [patientName, setPatientName] = useState<string>('');
  const [patientAge, setPatientAge] = useState<string>('');
  const [dateFormatted, setDateFormatted] = useState<string>(getInitialDate());
  const [defaultRoute, setDefaultRoute] = useState<AdministrationRoute>('USO ORAL');

  // Header and Footer Config
  const [unitName, setUnitName] = useState('CENTRO DE ATENÇÃO PSICOSSOCIAL');
  const [authorityName, setAuthorityName] = useState('SECRETARIA MUNICIPAL DE SAÚDE');
  const [cityPrefecture, setCityPrefecture] = useState('PREFEITURA MUNICIPAL DE ANAJÁS');
  const [addressLine1, setAddressLine1] = useState('TRAVESSA FRANCISCO JR. FILHO • CIDADE NOVA I • ANAJÁS/PA • CEP: 68 810-000');
  const [addressLine2, setAddressLine2] = useState('SISTEMA ÚNICO DE SAÚDE - SUS • REDE DE ATENÇÃO PSICOSSOCIAL (RAPS)');

  // Professional
  const [professionalName, setProfessionalName] = useState('');
  const [professionalRole, setProfessionalRole] = useState<'Enfermeiro' | 'Médico' | string>('Enfermeiro');
  const [professionalRegister, setProfessionalRegister] = useState('');

  // Medication Items
  const [items, setItems] = useState<PrescribedMedicationItem[]>([]);

  // Editing Item Temporary State
  const [newItemName, setNewItemName] = useState('');
  const [newItemRoute, setNewItemRoute] = useState<AdministrationRoute>('USO ORAL');
  const [newItemPosology, setNewItemPosology] = useState('');
  const [newItemDuration, setNewItemDuration] = useState('');
  const [newItemSchedule, setNewItemSchedule] = useState('');

  // UI Tabs & Views
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isHeaderFooterExpanded, setIsHeaderFooterExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize or reset state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (existingPrescription) {
      setType(existingPrescription.type || 'PRESCRIÇÃO');
      setPatientName(existingPrescription.patientName || patient?.fullName || '');
      setPatientAge(existingPrescription.patientAge || getPatientAgeFormatted());
      setDateFormatted(existingPrescription.dateFormatted || getInitialDate(initialConsultation));
      setDefaultRoute(existingPrescription.defaultRoute || 'USO ORAL');
      setUnitName(existingPrescription.header?.unitName || 'CENTRO DE ATENÇÃO PSICOSSOCIAL');
      setAuthorityName(existingPrescription.header?.authorityName || 'SECRETARIA MUNICIPAL DE SAÚDE');
      setCityPrefecture(existingPrescription.header?.cityPrefecture || 'PREFEITURA MUNICIPAL DE ANAJÁS');
      setAddressLine1(existingPrescription.footer?.addressLine1 || 'TRAVESSA FRANCISCO JR. FILHO');
      setAddressLine2(existingPrescription.footer?.addressLine2 || 'CIDADE NOVA I');
      setProfessionalName(existingPrescription.professionalName || initialConsultation?.authorName || currentUser.name);
      setProfessionalRole(existingPrescription.professionalRole || initialConsultation?.authorProfession || (currentUser.profession === 'medico' ? 'Médico' : 'Enfermeiro'));
      setProfessionalRegister(existingPrescription.professionalRegister || initialConsultation?.authorRegister || currentUser.professionalRegister || '');
      setItems(existingPrescription.items || []);
    } else {
      // New Prescription vinculada ao atendimento específico
      setType('PRESCRIÇÃO');
      setPatientName(patient?.fullName?.toUpperCase() || '');
      setPatientAge(getPatientAgeFormatted());
      setDateFormatted(getInitialDate(initialConsultation));
      setDefaultRoute('USO ORAL');
      setUnitName('CENTRO DE ATENÇÃO PSICOSSOCIAL');
      setAuthorityName('SECRETARIA MUNICIPAL DE SAÚDE');
      setCityPrefecture('PREFEITURA MUNICIPAL DE ANAJÁS');
      setAddressLine1('TRAVESSA FRANCISCO JR. FILHO • CIDADE NOVA I • ANAJÁS/PA • CEP: 68 810-000');
      setAddressLine2('SISTEMA ÚNICO DE SAÚDE - SUS • REDE DE ATENÇÃO PSICOSSOCIAL (RAPS)');

      // Professional
      setProfessionalName(currentUser.name);
      const roleStr = currentUser.profession === 'medico' ? 'Médico' : 'Enfermeiro';
      setProfessionalRole(roleStr);
      setProfessionalRegister(
        currentUser.professionalRegister
          ? `${roleStr === 'Médico' ? 'CRM' : 'COREN'} ${currentUser.professionalRegister}`
          : roleStr === 'Médico' ? 'CRM/PA' : 'COREN/PA'
      );

      // Default sample items if blank or empty
      setItems([
        {
          id: 'item-1',
          itemNumber: 1,
          medicationName: 'SULFATO FERROSO 40MG – 30CP',
          route: 'USO ORAL',
          posology: 'TOMAR 1CP 12/12h',
          duration: 'DURANTE 15 DIAS',
          scheduleInstructions: '7h – 19h',
        },
        {
          id: 'item-2',
          itemNumber: 2,
          medicationName: 'VITAMINA C 500MG – 01CX',
          route: 'USO ORAL',
          posology: '1CP AO DIA',
          duration: 'DURANTE 10 DIAS',
          scheduleInstructions: 'MANHÃ',
        },
      ]);
    }
  }, [isOpen, existingPrescription, patient, currentUser, initialConsultation]);

  if (!isOpen) return null;

  // Build current prescription data object
  const currentPrescriptionData: PrescriptionData = {
    id: existingPrescription?.id || `presc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type,
    patientId: patient?.id || initialConsultation?.patientId || '',
    patientName: patientName.toUpperCase() || 'PACIENTE NÃO IDENTIFICADO',
    patientAge: patientAge || '--',
    dateFormatted: dateFormatted || 'Anajás, ' + new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    header: {
      unitName: unitName || 'CENTRO DE ATENÇÃO PSICOSSOCIAL',
      authorityName: authorityName || 'SECRETARIA MUNICIPAL DE SAÚDE',
      cityPrefecture: cityPrefecture || 'PREFEITURA MUNICIPAL DE ANAJÁS',
      headerHeightCm: 2.5,
      leftLogoUrl: existingPrescription?.header?.leftLogoUrl || LOGO_CAPS_BASE64,
      rightLogoUrl: existingPrescription?.header?.rightLogoUrl || LOGO_CAPS_BASE64,
    },
    footer: {
      addressLine1: addressLine1 || 'TRAVESSA FRANCISCO JR. FILHO',
      addressLine2: addressLine2 || 'CIDADE NOVA I',
      footerHeightCm: 1.25,
    },
    defaultRoute: defaultRoute || 'USO ORAL',
    items,
    professionalName: professionalName || existingPrescription?.professionalName || initialConsultation?.authorName || currentUser.name,
    professionalRole: professionalRole || existingPrescription?.professionalRole || initialConsultation?.authorProfession || currentUser.profession,
    professionalRegister: professionalRegister || existingPrescription?.professionalRegister || initialConsultation?.authorRegister || currentUser.professionalRegister,
    professionalStampUrl: existingPrescription ? (existingPrescription.professionalStampUrl || (initialConsultation?.authorDigitalStampUrl ?? (currentUser as any)?.digitalStampUrl)) : (currentUser as any)?.digitalStampUrl,
    useDigitalStamp: existingPrescription ? (existingPrescription.useDigitalStamp ?? true) : ((currentUser as any)?.useDigitalStamp ?? Boolean((currentUser as any)?.digitalStampUrl)),
    workplace: existingPrescription?.workplace || initialConsultation?.workplace || currentUser.workplace || 'CAPS I - Anajás',
    createdAt: existingPrescription?.createdAt || (initialConsultation?.timestamp ? new Date(initialConsultation.timestamp).getTime() : Date.now()),
    consultationId: initialConsultation?.id || null,
  };

  // Add Item to list
  const handleAddItem = () => {
    if (!newItemName.trim()) {
      onShowToast('error', 'Informe o nome e concentração do medicamento.');
      return;
    }

    const newItem: PrescribedMedicationItem = {
      id: `item-${Date.now()}`,
      itemNumber: items.length + 1,
      medicationName: newItemName.trim().toUpperCase(),
      route: newItemRoute,
      posology: newItemPosology.trim().toUpperCase(),
      duration: newItemDuration.trim().toUpperCase(),
      scheduleInstructions: newItemSchedule.trim().toUpperCase(),
    };

    setItems((prev) => [...prev, newItem]);
    // Clear inputs
    setNewItemName('');
    setNewItemPosology('');
    setNewItemDuration('');
    setNewItemSchedule('');
    onShowToast('success', 'Medicamento adicionado à prescrição.');
  };

  // Remove Item
  const handleRemoveItem = (id: string) => {
    setItems((prev) =>
      prev
        .filter((i) => i.id !== id)
        .map((item, idx) => ({ ...item, itemNumber: idx + 1 }))
    );
  };

  // Pre-fill from quick list
  const handleSelectQuickMed = (med: typeof COMMON_APS_MEDICATIONS[0]) => {
    setNewItemName(med.name);
    setNewItemRoute(med.route as AdministrationRoute);
    setNewItemPosology(med.posology);
    setNewItemDuration(med.duration);
    setNewItemSchedule(med.schedule);
  };

  // Attempt to parse medications from consultation plan text
  const handleImportFromConsultationPlan = () => {
    const textToAnalyze = initialConsultationPlanText || consultationPlanText || initialConsultation?.plano || '';
    if (!textToAnalyze) {
      onShowToast('info', 'Nenhum plano terapêutico disponível para importar medicamentos.');
      return;
    }

    const lines = textToAnalyze.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed: PrescribedMedicationItem[] = [];

    lines.forEach((line) => {
      const cleanLine = line.replace(/^[-*•\d.)\s]+/, '').trim();
      if (
        cleanLine.length > 3 &&
        /(mg|g|ml|cp|comprimido|ampola|gotas|frasco|pomada|spray|tomar|iniciar|prescrito|manter)/i.test(cleanLine)
      ) {
        parsed.push({
          id: `imp-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          itemNumber: items.length + parsed.length + 1,
          medicationName: cleanLine.toUpperCase(),
          route: defaultRoute,
          posology: 'CONFORME PRESCRIÇÃO',
          duration: 'DURANTE O TRATAMENTO',
          scheduleInstructions: 'CONFORME HORÁRIO',
        });
      }
    });

    if (parsed.length > 0) {
      setItems((prev) => [...prev, ...parsed]);
      onShowToast('success', `${parsed.length} medicamento(s) importado(s) do plano terapêutico.`);
    } else {
      onShowToast('info', 'Não foram encontrados itens com dosagem/posologia no plano.');
    }
  };

  // Trigger Print (A4 Landscape 2-Via Sheet via functional direct print view)
  const handlePrint = () => {
    setActiveTab('preview');
    try {
      openPrescriptionInNewTab(currentPrescriptionData, currentUser);
      onShowToast('info', 'Documento gerado para impressão. A janela de impressão abrirá automaticamente.', 'Imprimir');
    } catch (err) {
      console.error('Falha ao abrir impressão:', err);
      onShowToast('error', 'Não foi possível abrir a tela de impressão. Verifique se pop-ups estão permitidos.');
    }
  };

  // Save Prescription Handler
  const handleSave = async () => {
    if (items.length === 0) {
      onShowToast('error', 'Adicione pelo menos um medicamento antes de salvar.');
      return;
    }

    setIsSaving(true);
    try {
      await onSavePrescription(currentPrescriptionData, initialConsultation?.id || undefined);
      onShowToast(
        'success',
        `${type} em 2 vias salva e vinculada à linha do tempo do paciente!`,
        'Receituário Registrado'
      );
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar prescrição:', err);
      onShowToast('error', 'Falha ao salvar a prescrição no prontuário.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
        {/* Invisible in standard screen, but target of @media print */}
        <div className="printable-prescription-target hidden print:block w-full h-full">
          <PrescriptionPrintSheet prescription={currentPrescriptionData} isPrintOnly />
        </div>

        {/* Modal Window (Hidden in print) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden print:hidden"
        >
          {/* Header Bar */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Prescrição & Transcrição de Medicamentos
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                    2 Vias A4 Paisagem (1,27 cm)
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Exclusivo para Enfermeiros e Médicos • Template SUS CAPS Anajás com vias idênticas
                </p>
              </div>
            </div>

            {/* Mode Switchers & Actions */}
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'edit'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Preencher
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'preview'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Visualizar 2 Vias
                </button>
              </div>

              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition-colors shadow-xs"
                title="Imprimir em 2 vias A4 Paisagem"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Imprimir 2 Vias</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {activeTab === 'edit' ? (
              <div className="space-y-6">
                {/* 1. Header & Type Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                  {/* Document Type (Lista Suspensa: PRESCRIÇÃO / TRANSCRIÇÃO) */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Tipo de Documento (Lista Suspensa)
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as PrescriptionType)}
                      className="w-full bg-white dark:bg-slate-900 border-2 border-blue-500 font-extrabold text-blue-700 dark:text-blue-400 text-sm rounded-xl px-3 py-2.5 outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="PRESCRIÇÃO">PRESCRIÇÃO</option>
                      <option value="TRANSCRIÇÃO">TRANSCRIÇÃO</option>
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Conforme modelo oficial em caixa alta e negrito
                    </p>
                  </div>

                  {/* Via de Administração Padrão (Lista Suspensa: USO ORAL, USO IM, etc.) */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                      Via de Administração Principal
                    </label>
                    <select
                      value={defaultRoute}
                      onChange={(e) => {
                        setDefaultRoute(e.target.value as AdministrationRoute);
                        setNewItemRoute(e.target.value as AdministrationRoute);
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 text-sm rounded-xl px-3 py-2.5 outline-hidden focus:border-blue-500"
                    >
                      {ADMINISTRATION_ROUTES.map((route) => (
                        <option key={route} value={route}>
                          {route}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Renderizado centralizado acima dos itens
                    </p>
                  </div>

                  {/* Date & Municipality */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Data do Documento (Editável)</span>
                    </label>
                    <input
                      type="text"
                      value={dateFormatted}
                      onChange={(e) => setDateFormatted(e.target.value)}
                      placeholder="Anajás, 04 de setembro de 2026"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-medium rounded-xl px-3 py-2.5 outline-hidden focus:border-blue-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>Alinhado à direita acima da assinatura</span>
                      {initialConsultation && (
                        <span className="text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Mesma data do atendimento
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* 2. Patient Information (Fixed Labels: NOME / IDADE) */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span>Dados do Paciente (Tabela do Receituário)</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-9">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        NOME DO PACIENTE (TEXTO FIXO: NOME)
                      </label>
                      <input
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value.toUpperCase())}
                        placeholder="NOME COMPLETO DO PACIENTE"
                        className="w-full bg-slate-50 dark:bg-slate-800 font-bold uppercase text-slate-900 dark:text-slate-100 text-sm border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 outline-hidden focus:border-blue-500"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        IDADE (TEXTO FIXO: IDADE)
                      </label>
                      <input
                        type="text"
                        value={patientAge}
                        onChange={(e) => setPatientAge(e.target.value.toUpperCase())}
                        placeholder="Ex: 49A"
                        className="w-full bg-slate-50 dark:bg-slate-800 font-bold uppercase text-center text-slate-900 dark:text-slate-100 text-sm border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 outline-hidden focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Medication Items Builder */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>Itens Prescritos / Medicamentos</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                          {items.length} item(ns)
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Cada item é numerado com medicamento, concentração, posologia, duração e horário
                      </p>
                    </div>

                    {(consultationPlanText || initialConsultation?.plano) && (
                      <button
                        type="button"
                        onClick={handleImportFromConsultationPlan}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold transition-colors border border-blue-200 dark:border-blue-800"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Preencher do Plano da Consulta</span>
                      </button>
                    )}
                  </div>

                  {/* Smart SUS & REMUME Medication Database Search & Quick Filter */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Banco SUS de Medicamentos Padronizados (RENAME / REMUME)</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Preenchimento inteligente com posologia e via
                      </span>
                    </div>

                    <MedicationSelector
                      medications={medications}
                      onSelectMedication={(selected) => {
                        setNewItemName(selected.name);
                        setNewItemRoute(selected.route);
                        setNewItemPosology(selected.posology);
                        setNewItemDuration(selected.duration);
                        setNewItemSchedule(selected.schedule);
                      }}
                      onSaveNewMedicationToDb={onSaveNewMedicationToDb}
                      onShowToast={onShowToast}
                    />
                  </div>

                  {/* Add New Item Form (Pre-filled from search or manual edit) */}
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                      <span>Item a ser inserido na prescrição:</span>
                      {newItemName && (
                        <span className="text-[11px] text-blue-600 font-semibold">
                          Fármaco pronto para adicionar
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      {/* Name, Concentration & Total Quantity */}
                      <div className="sm:col-span-8">
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Fármaco, Concentração e Quantidade Total
                        </label>
                        <input
                          type="text"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="Ex: SULFATO FERROSO 40MG – 30CP"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold outline-hidden focus:border-blue-500"
                        />
                      </div>

                      {/* Route for this specific item */}
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Via de Administração
                        </label>
                        <select
                          value={newItemRoute}
                          onChange={(e) => setNewItemRoute(e.target.value as AdministrationRoute)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold outline-hidden focus:border-blue-500"
                        >
                          {ADMINISTRATION_ROUTES.map((route) => (
                            <option key={route} value={route}>
                              {route}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Posology */}
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Posologia (Modo de Tomar)
                        </label>
                        <input
                          type="text"
                          value={newItemPosology}
                          onChange={(e) => setNewItemPosology(e.target.value)}
                          placeholder="Ex: TOMAR 1CP 12/12h"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium outline-hidden focus:border-blue-500"
                        />
                      </div>

                      {/* Duration */}
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Duração do Tratamento
                        </label>
                        <input
                          type="text"
                          value={newItemDuration}
                          onChange={(e) => setNewItemDuration(e.target.value)}
                          placeholder="Ex: DURANTE 15 DIAS"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium outline-hidden focus:border-blue-500"
                        />
                      </div>

                      {/* Schedule / Special Instructions */}
                      <div className="sm:col-span-4">
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Horários / Instruções
                        </label>
                        <input
                          type="text"
                          value={newItemSchedule}
                          onChange={(e) => setNewItemSchedule(e.target.value)}
                          placeholder="Ex: 7h – 19h ou MANHÃ"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium outline-hidden focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar Medicamento</span>
                      </button>
                    </div>
                  </div>

                  {/* List of Configured Items */}
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/70"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-md">
                              {item.itemNumber || idx + 1}-
                            </span>
                            <span className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase">
                              {item.medicationName}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">
                              {item.route}
                            </span>
                          </div>

                          <div className="pl-6 text-xs text-slate-600 dark:text-slate-300 font-medium space-y-0.5">
                            {item.posology && <div>• {item.posology}</div>}
                            {item.duration && <div>• {item.duration}</div>}
                            {item.scheduleInstructions && <div>• {item.scheduleInstructions}</div>}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Remover medicamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Editable Header & Footer Accordion */}
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsHeaderFooterExpanded(!isHeaderFooterExpanded)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-slate-500" />
                      <span>Configurações do Cabeçalho e Rodapé Institucional (Editáveis)</span>
                    </div>
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      {isHeaderFooterExpanded ? 'Ocultar' : 'Personalizar'}
                    </span>
                  </button>

                  {isHeaderFooterExpanded && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Cabeçalho Linha 1 (Unidade)
                          </label>
                          <input
                            type="text"
                            value={unitName}
                            onChange={(e) => setUnitName(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Cabeçalho Linha 2 (Secretaria)
                          </label>
                          <input
                            type="text"
                            value={authorityName}
                            onChange={(e) => setAuthorityName(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Cabeçalho Linha 3 (Prefeitura)
                          </label>
                          <input
                            type="text"
                            value={cityPrefecture}
                            onChange={(e) => setCityPrefecture(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-semibold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Rodapé Linha 1 (Logradouro / Travessa)
                          </label>
                          <input
                            type="text"
                            value={addressLine1}
                            onChange={(e) => setAddressLine1(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Rodapé Linha 2 (Bairro / Município)
                          </label>
                          <input
                            type="text"
                            value={addressLine2}
                            onChange={(e) => setAddressLine2(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-semibold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Profissional Responsável
                          </label>
                          <input
                            type="text"
                            value={professionalName}
                            onChange={(e) => setProfessionalName(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Carimbo e Registro (CRM ou COREN)
                          </label>
                          <input
                            type="text"
                            value={professionalRegister}
                            onChange={(e) => setProfessionalRegister(e.target.value)}
                            placeholder="Ex: COREN/PA 123456 ou CRM/PA 7890"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Visualização Realista da Folha A4 Paisagem (2 Vias Idênticas) */
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 rounded-xl flex items-center justify-between text-xs text-blue-900 dark:text-blue-200">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>
                      <strong>Visualização Prévia A4 Paisagem (297 x 210 mm)</strong> • 2 Vias Idênticas com margens estreitas de 1,27 cm.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                      title="Imprimir folha A4 Paisagem (2 Vias)"
                    >
                      <Printer className="w-4 h-4 text-blue-100" />
                      <span>Imprimir</span>
                    </button>
                  </div>
                </div>

                {/* Printable Canvas Container */}
                <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-lg p-2 sm:p-6 bg-slate-200 dark:bg-slate-950 flex justify-center">
                  <div className="bg-white text-slate-900 shadow-2xl p-4 w-full rounded-sm">
                    <PrescriptionPrintSheet prescription={currentPrescriptionData} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-3">
              {activeTab === 'edit' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-bold text-xs hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                  title="Abrir pré-visualização da folha A4 Paisagem"
                >
                  <Eye className="w-4 h-4" />
                  <span>Pré-visualizar Folha</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                  title="Imprimir folha A4 Paisagem (2 Vias)"
                >
                  <Printer className="w-4 h-4 text-blue-100" />
                  <span>Imprimir</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs transition-colors shadow-md disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Salvando...' : 'Salvar no Prontuário'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
