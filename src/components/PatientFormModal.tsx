import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserPlus,
  X,
  Calendar,
  CreditCard,
  User,
  HeartHandshake,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Baby,
  ShieldAlert,
  MapPin,
  ChevronDown,
  ChevronUp,
  Database,
  Search,
  Mail,
  Globe,
  Layers,
  Building2,
  Phone,
  UserCheck,
} from 'lucide-react';
import { Patient, KinshipType } from '../types';
import {
  calculateChronologicalAge,
  formatCPF,
  validateCPF,
  formatCNS,
  validateCNS,
} from '../utils/dateCalculator';
import { formatName, formatPhoneBR } from '../utils/textFormatters';
import { syncPatientToDb2, fetchStreetTypesCatalogFromDb2 } from '../services/secondarySupabase';
import { DEFAULT_STREET_TYPES, StreetTypeItem } from '../data/streetTypes';

interface PatientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePatient: (patient: Patient) => void;
  patientToEdit?: Patient | null;
  patients?: Patient[];
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

const KINSHIP_OPTIONS: KinshipType[] = [
  'Mãe',
  'Pai',
  'Avó / Avô',
  'Tia / Tio',
  'Irmã / Irmão',
  'Cônjuge / Companheiro(a)',
  'Tutor(a) Legal / Curador(a)',
  'Outro',
];

export const PatientFormModal: React.FC<PatientFormModalProps> = ({
  isOpen,
  onClose,
  onSavePatient,
  patientToEdit,
  patients = [],
  onShowToast,
}) => {
  const [fullName, setFullName] = useState('');
  const [cns, setCns] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'Feminino' | 'Masculino' | 'Outro'>('Feminino');
  const [phone, setPhone] = useState('');
  const [legalGuardianName, setLegalGuardianName] = useState('');
  const [guardianKinship, setGuardianKinship] = useState<KinshipType>('Mãe');
  const [guardianKinshipCustom, setGuardianKinshipCustom] = useState('');

  // Novos campos: UBS Referência, Contato e ACS, Contato
  const [referenceUbs, setReferenceUbs] = useState('');
  const [referenceUbsContact, setReferenceUbsContact] = useState('');
  const [acsName, setAcsName] = useState('');
  const [acsContact, setAcsContact] = useState('');
  const [isUbsOpen, setIsUbsOpen] = useState(false);
  const [isAcsOpen, setIsAcsOpen] = useState(false);
  const ubsRef = useRef<HTMLDivElement>(null);
  const acsRef = useRef<HTMLDivElement>(null);

  // Campos estendidos para SUS / BPA-I e Banco 2
  const [email, setEmail] = useState('');
  const [nationality, setNationality] = useState('Brasileira');
  const [race, setRace] = useState('Branca');
  const [ethnicity, setEthnicity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [streetType, setStreetType] = useState('Rua');
  const [streetCode, setStreetCode] = useState('');
  const [codMunicipio, setCodMunicipio] = useState('');
  const [streetTypesCatalog, setStreetTypesCatalog] = useState<StreetTypeItem[]>(DEFAULT_STREET_TYPES);
  const [isLoadingStreetTypes, setIsLoadingStreetTypes] = useState(false);
  const [isStreetTypeOpen, setIsStreetTypeOpen] = useState(false);
  const [isStreetCodeOpen, setIsStreetCodeOpen] = useState(false);
  const [streetTypeFilter, setStreetTypeFilter] = useState('');
  const [streetCodeFilter, setStreetCodeFilter] = useState('');
  const streetTypeRef = useRef<HTMLDivElement>(null);
  const streetCodeRef = useRef<HTMLDivElement>(null);

  // Fecha as listas suspensas (Logradouro, UBS, ACS) ao clicar fora sem bloquear cliques nos outros campos
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (streetTypeRef.current && !streetTypeRef.current.contains(event.target as Node)) {
        setIsStreetTypeOpen(false);
      }
      if (streetCodeRef.current && !streetCodeRef.current.contains(event.target as Node)) {
        setIsStreetCodeOpen(false);
      }
      if (ubsRef.current && !ubsRef.current.contains(event.target as Node)) {
        setIsUbsOpen(false);
      }
      if (acsRef.current && !acsRef.current.contains(event.target as Node)) {
        setIsAcsOpen(false);
      }
    };
    if (isStreetTypeOpen || isStreetCodeOpen || isUbsOpen || isAcsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStreetTypeOpen, isStreetCodeOpen, isUbsOpen, isAcsOpen]);
  const [isExtendedSectionOpen, setIsExtendedSectionOpen] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Validation states
  const [cnsTouched, setCnsTouched] = useState(false);
  const [cpfTouched, setCpfTouched] = useState(false);

  // Carrega catálogo de tipos de logradouro do BD2 quando o modal abre (tabela street_types_catalog)
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const loadCatalog = async () => {
      setIsLoadingStreetTypes(true);
      try {
        const db2Types = await fetchStreetTypesCatalogFromDb2();
        if (isMounted && db2Types && db2Types.length > 0) {
          setStreetTypesCatalog(db2Types);
        }
      } catch (err) {
        console.warn("Uso do catálogo padrão de logradouros:", err);
      } finally {
        if (isMounted) setIsLoadingStreetTypes(false);
      }
    };
    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Synchronize when editing or opening
  useEffect(() => {
    if (patientToEdit) {
      setFullName(patientToEdit.fullName || '');
      setCns(patientToEdit.cns || '');
      setCpf(patientToEdit.cpf || '');
      setBirthDate(patientToEdit.birthDate || '');
      setGender(patientToEdit.gender || 'Feminino');
      setPhone(formatPhoneBR(patientToEdit.phone || ''));
      setLegalGuardianName(patientToEdit.legalGuardianName || '');
      setGuardianKinship(patientToEdit.guardianKinship || 'Mãe');
      setGuardianKinshipCustom(patientToEdit.guardianKinshipCustom || '');
      setReferenceUbs(patientToEdit.referenceUbs || '');
      setReferenceUbsContact(formatPhoneBR(patientToEdit.referenceUbsContact || ''));
      setAcsName(patientToEdit.acsName || '');
      setAcsContact(formatPhoneBR(patientToEdit.acsContact || ''));
      setIsUbsOpen(false);
      setIsAcsOpen(false);
      setEmail(patientToEdit.email || '');
      setNationality(patientToEdit.nationality || 'Brasileira');
      setRace(patientToEdit.race || 'Branca');
      setEthnicity(patientToEdit.ethnicity || '');
      setZipCode(patientToEdit.zipCode || '');
      setCity(patientToEdit.city || '');
      setNeighborhood(patientToEdit.neighborhood || '');
      setStreet(patientToEdit.street || '');
      setNumber(patientToEdit.number || '');
      setComplement(patientToEdit.complement || '');
      const initType = patientToEdit.streetType || 'Rua';
      setStreetType(initType);
      const matched = DEFAULT_STREET_TYPES.find((st) => st.name.toLowerCase() === initType.toLowerCase());
      setStreetCode(patientToEdit.streetCode || matched?.code || '081');
      setCodMunicipio(patientToEdit.codMunicipio || '');
    } else {
      // Default initial state
      setFullName('');
      setCns('');
      setCpf('');
      setBirthDate('');
      setGender('Feminino');
      setPhone('');
      setLegalGuardianName('');
      setGuardianKinship('Mãe');
      setGuardianKinshipCustom('');
      setReferenceUbs('');
      setReferenceUbsContact('');
      setAcsName('');
      setAcsContact('');
      setIsUbsOpen(false);
      setIsAcsOpen(false);
      setEmail('');
      setNationality('Brasileira');
      setRace('Branca');
      setEthnicity('');
      setZipCode('');
      setCity('');
      setNeighborhood('');
      setStreet('');
      setNumber('');
      setComplement('');
      setStreetType('Rua');
      setStreetCode('081');
      setCodMunicipio('');
      setCnsTouched(false);
      setCpfTouched(false);
    }
  }, [patientToEdit, isOpen]);

  // Busca rápida de CEP no ViaCEP
  const handleFetchCep = async (rawCep?: string) => {
    const cepToSearch = (rawCep || zipCode).replace(/\D/g, '');
    if (cepToSearch.length !== 8) {
      onShowToast('info', 'Informe um CEP válido com 8 dígitos para consultar o endereço.', 'CEP Incompleto');
      return;
    }
    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepToSearch}/json/`);
      const data = await res.json();
      if (data.erro) {
        onShowToast('error', 'CEP não encontrado na base dos Correios.', 'CEP Não Encontrado');
      } else {
        if (data.logradouro) setStreet(data.logradouro);
        if (data.bairro) setNeighborhood(data.bairro);
        if (data.localidade) setCity(data.localidade);
        if (data.ibge) {
          const rawIbge = String(data.ibge).replace(/\D/g, '');
          const ibge6Digits = rawIbge.length >= 7 ? rawIbge.slice(0, 6) : rawIbge;
          setCodMunicipio(ibge6Digits);
        }
        // Dedução do tipo de logradouro
        if (data.logradouro) {
          const firstWord = data.logradouro.split(' ')[0].toLowerCase();
          if (['rua', 'avenida', 'travessa', 'alameda', 'praça', 'rodovia', 'estrada', 'margem'].includes(firstWord)) {
            setStreetType(firstWord.charAt(0).toUpperCase() + firstWord.slice(1));
          }
        }
        onShowToast('success', `${data.localidade} - ${data.uf}: Endereço preenchido automaticamente!`, 'CEP Localizado');
      }
    } catch {
      onShowToast('error', 'Falha ao buscar CEP. Verifique sua conexão.', 'Erro na Busca');
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Real-time chronological age calculation

  // Seleção sincronizada entre Tipo Logradouro (name) e Cód. Logradouro (code)
  const handleSelectStreetType = (item: StreetTypeItem) => {
    setStreetType(item.name);
    setStreetCode(item.code);
    setIsStreetTypeOpen(false);
    setStreetTypeFilter("");
  };

  const handleSelectStreetCode = (item: StreetTypeItem) => {
    setStreetCode(item.code);
    setStreetType(item.name);
    setIsStreetCodeOpen(false);
    setStreetCodeFilter("");
  };

  // Busca inteligente dentro do próprio campo para Tipo Logradouro (Componente 1)
  // Ao clicar/abrir sem digitar, mostra todas as opções.
  // Ao digitar a partir da primeira letra, prioriza início da palavra e filtra sem acentos.
  const filteredStreetTypeOptions = useMemo(() => {
    const query = streetTypeFilter.trim();
    if (!query) {
      return streetTypesCatalog;
    }
    const normalize = (text: string) =>
      text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const normQ = normalize(query);

    return [...streetTypesCatalog]
      .filter((st) => normalize(st.name).includes(normQ))
      .sort((a, b) => {
        const aNorm = normalize(a.name);
        const bNorm = normalize(b.name);
        const aStarts = aNorm.startsWith(normQ);
        const bStarts = bNorm.startsWith(normQ);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.name.localeCompare(b.name, "pt-BR");
      });
  }, [streetTypesCatalog, streetTypeFilter]);

  // Lista com apenas os códigos em números (Componente 2)
  // Busca inteligente a partir do primeiro dígito digitado.
  const filteredStreetCodeOptions = useMemo(() => {
    const query = streetCodeFilter.trim();
    if (!query) {
      return streetTypesCatalog;
    }
    return [...streetTypesCatalog]
      .filter((st) => st.code.includes(query))
      .sort((a, b) => {
        const aStarts = a.code.startsWith(query);
        const bStarts = b.code.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.code.localeCompare(b.code);
      });
  }, [streetTypesCatalog, streetCodeFilter]);

  // Busca inteligente para UBS Referência: lista com valores já cadastrados em outros pacientes
  const registeredUbsOptions = useMemo(() => {
    const map = new Map<string, string>();
    (patients || []).forEach((p) => {
      const name = (p.referenceUbs || '').trim();
      if (name) {
        if (!map.has(name) || (!map.get(name) && p.referenceUbsContact)) {
          map.set(name, p.referenceUbsContact?.trim() || '');
        }
      }
    });
    return Array.from(map.entries())
      .map(([name, contact]) => ({ name, contact }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [patients]);

  const filteredUbsOptions = useMemo(() => {
    const query = referenceUbs.trim();
    if (!query) return registeredUbsOptions;
    const normalize = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const normQ = normalize(query);
    return registeredUbsOptions.filter((opt) => normalize(opt.name).includes(normQ));
  }, [registeredUbsOptions, referenceUbs]);

  // Busca inteligente para ACS: lista com valores já cadastrados em outros pacientes
  const registeredAcsOptions = useMemo(() => {
    const map = new Map<string, string>();
    (patients || []).forEach((p) => {
      const name = (p.acsName || '').trim();
      if (name) {
        if (!map.has(name) || (!map.get(name) && p.acsContact)) {
          map.set(name, p.acsContact?.trim() || '');
        }
      }
    });
    return Array.from(map.entries())
      .map(([name, contact]) => ({ name, contact }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [patients]);

  const filteredAcsOptions = useMemo(() => {
    const query = acsName.trim();
    if (!query) return registeredAcsOptions;
    const normalize = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const normQ = normalize(query);
    return registeredAcsOptions.filter((opt) => normalize(opt.name).includes(normQ));
  }, [registeredAcsOptions, acsName]);

  const handleSelectUbs = (opt: { name: string; contact: string }) => {
    setReferenceUbs(opt.name);
    if (opt.contact && !referenceUbsContact.trim()) {
      setReferenceUbsContact(formatPhoneBR(opt.contact));
    }
    setIsUbsOpen(false);
  };

  const handleSelectAcs = (opt: { name: string; contact: string }) => {
    setAcsName(opt.name);
    if (opt.contact && !acsContact.trim()) {
      setAcsContact(formatPhoneBR(opt.contact));
    }
    setIsAcsOpen(false);
  };

  const calculatedAge = calculateChronologicalAge(birthDate);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  const handleCnsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCns(formatCNS(e.target.value));
  };

  const isCnsValid = validateCNS(cns);
  const isCpfValid = validateCPF(cpf);

  // Uniqueness validation (CNS and CPF cannot be duplicated across patients)
  const duplicateCnsPatient = useMemo(() => {
    const rawDigits = cns.replace(/\D/g, '');
    if (!rawDigits) return null;
    return (patients || []).find((p) => {
      if (patientToEdit?.id && p.id === patientToEdit.id) return false;
      const pCns = (p.cns || '').replace(/\D/g, '');
      return pCns && pCns === rawDigits;
    });
  }, [cns, patients, patientToEdit]);

  const duplicateCpfPatient = useMemo(() => {
    const rawDigits = cpf.replace(/\D/g, '');
    if (!rawDigits) return null;
    return (patients || []).find((p) => {
      if (patientToEdit?.id && p.id === patientToEdit.id) return false;
      const pCpf = (p.cpf || '').replace(/\D/g, '');
      return pCpf && pCpf === rawDigits;
    });
  }, [cpf, patients, patientToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      onShowToast('error', 'Informe o nome completo do paciente.', 'Campo Obrigatório');
      return;
    }

    if (!birthDate) {
      onShowToast('error', 'Informe a data de nascimento para o cálculo da idade.', 'Campo Obrigatório');
      return;
    }

    if (cns.trim() && !isCnsValid && cns.replace(/\D/g, '').length !== 15) {
      onShowToast('error', 'O Cartão Nacional de Saúde (CNS) deve ter 15 dígitos.', 'CNS Incompleto');
      return;
    }

    // Uniqueness blocking checks
    if (duplicateCnsPatient) {
      onShowToast(
        'error',
        `O Cartão SUS (CNS) ${cns} já está cadastrado para o paciente "${duplicateCnsPatient.fullName}". O Cartão SUS deve ser único para cada paciente.`,
        'Cartão SUS Duplicado'
      );
      return;
    }

    if (duplicateCpfPatient) {
      onShowToast(
        'error',
        `O CPF ${cpf} já está cadastrado para o paciente "${duplicateCpfPatient.fullName}". O CPF deve ser único para cada paciente.`,
        'CPF Duplicado'
      );
      return;
    }

    const patient: Patient = {
      id: patientToEdit?.id || `pat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fullName: fullName.trim(),
      cns: cns.trim(),
      cpf: cpf.trim(),
      birthDate,
      gender,
      phone: phone.trim(),
      legalGuardianName: calculatedAge.isMinor || legalGuardianName.trim() ? legalGuardianName.trim() : undefined,
      guardianKinship: calculatedAge.isMinor || legalGuardianName.trim() ? guardianKinship : undefined,
      guardianKinshipCustom:
        guardianKinship === 'Outro' && guardianKinshipCustom.trim()
          ? guardianKinshipCustom.trim()
          : undefined,
      referenceUbs: referenceUbs.trim() || undefined,
      referenceUbsContact: referenceUbsContact.trim() || undefined,
      acsName: acsName.trim() || undefined,
      acsContact: acsContact.trim() || undefined,
      email: email.trim() || undefined,
      nationality: nationality.trim() || 'Brasileira',
      race: race.trim() || 'Branca',
      ethnicity: ethnicity.trim() || undefined,
      zipCode: zipCode.trim() || undefined,
      city: city.trim() || undefined,
      neighborhood: neighborhood.trim() || undefined,
      street: street.trim() || undefined,
      number: number.trim() || undefined,
      complement: complement.trim() || undefined,
      streetType: streetType.trim() || 'Rua',
      streetCode: streetCode.trim() || undefined,
      codMunicipio: codMunicipio.trim() ? codMunicipio.replace(/\D/g, '').slice(0, 6) : undefined,
      createdAt: patientToEdit?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    onSavePatient(patient);

    // Sincronização em segundo plano não-bloqueante com o Banco 2
    syncPatientToDb2(patient)
      .then((syncRes) => {
        if (syncRes.success) {
          onShowToast(
            'success',
            `Paciente "${patient.fullName}" sincronizado com sucesso no Banco 2 (${syncRes.documentType}: ${syncRes.documentUsed})!`,
            'Exportado ao Banco 2'
          );
        } else if (syncRes.skipped) {
          onShowToast(
            'info',
            'Paciente salvo localmente. Para exportar ao Banco 2, informe o CPF ou Cartão SUS (CNS).',
            'Aviso de Integração'
          );
        } else {
          onShowToast(
            'error',
            `Paciente salvo no App 1, mas falhou ao salvar no Banco 2: ${syncRes.message}`,
            'Aviso do Banco 2'
          );
        }
      })
      .catch((err) => {
        onShowToast(
          'error',
          `Paciente salvo no App 1, mas houve erro ao comunicar com Banco 2: ${err?.message || String(err)}`,
          'Erro Banco 2'
        );
      });

    onShowToast(
      'success',
      patientToEdit ? 'Dados do paciente atualizados com sucesso!' : 'Novo paciente cadastrado no e-SUS PEC!',
      'Cadastro Salvo'
    );
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="patient-form-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          onClick={onClose}
        >
          <motion.div
            id="patient-form-modal"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {patientToEdit ? 'Editar Cadastro do Paciente' : 'Novo Cadastro de Paciente (e-SUS)'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Identificação, Cartão SUS, cálculo cronológico de idade e responsável legal
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="close-patient-form-modal-btn"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Aviso Inteligente de Integração com o Banco 2 */}
              <div className="flex items-start sm:items-center gap-2 p-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-[11px] text-teal-800 dark:text-teal-300">
                <Database className="w-4 h-4 text-teal-600 shrink-0 mt-0.5 sm:mt-0" />
                <div className="flex-1">
                  <span className="font-bold">Integração Banco 2 (Produção/BPA): </span>
                  <span>
                    A coluna única documental aceita tanto CPF quanto CNS. O sistema <strong className="underline decoration-teal-500">prioriza o envio do CPF</strong>; se este não for informado, envia o <strong className="underline decoration-teal-500">CNS</strong>.
                  </span>
                </div>
              </div>

              {/* Documentos Identificadores Únicos no Topo: CPF e Cartão SUS (CNS) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* CPF */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      CPF
                    </label>
                    {duplicateCpfPatient ? (
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Já cadastrado
                      </span>
                    ) : cpf ? (
                      <span
                        className={`text-[10px] font-semibold ${
                          isCpfValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {isCpfValid ? '✓ CPF Válido' : '000.000.000-00'}
                      </span>
                    ) : null}
                  </div>
                  <div className="relative">
                    <CreditCard className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${duplicateCpfPatient ? 'text-rose-500' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      id="patient-cpf-input"
                      value={cpf}
                      onChange={handleCpfChange}
                      onBlur={() => setCpfTouched(true)}
                      placeholder="000.000.000-00"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 outline-none transition-colors ${
                        duplicateCpfPatient
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500'
                          : 'bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-teal-500'
                      }`}
                    />
                  </div>
                  {duplicateCpfPatient && (
                    <div className="mt-1.5 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-1.5 animate-in fade-in duration-150">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>CPF duplicado:</strong> Este CPF já pertence a <strong>{duplicateCpfPatient.fullName}</strong>. O CPF deve ser único para cada paciente.
                      </span>
                    </div>
                  )}
                </div>

                {/* Cartão SUS (CNS) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Cartão SUS (CNS)
                    </label>
                    {duplicateCnsPatient ? (
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Já cadastrado
                      </span>
                    ) : cns ? (
                      <span
                        className={`text-[10px] font-semibold ${
                          isCnsValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
                        }`}
                      >
                        {isCnsValid ? '✓ Válido' : `${cns.replace(/\D/g, '').length}/15 dígitos`}
                      </span>
                    ) : null}
                  </div>
                  <div className="relative">
                    <CreditCard className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${duplicateCnsPatient ? 'text-rose-500' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      id="patient-cns-input"
                      value={cns}
                      onChange={handleCnsChange}
                      onBlur={() => setCnsTouched(true)}
                      placeholder="000 0000 0000 0000"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 outline-none transition-colors ${
                        duplicateCnsPatient
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500'
                          : cnsTouched && cns && !isCnsValid
                          ? 'bg-slate-50 dark:bg-slate-950 border border-amber-400 dark:border-amber-600 focus:ring-2 focus:ring-teal-500'
                          : 'bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-teal-500'
                      }`}
                    />
                  </div>
                  {duplicateCnsPatient && (
                    <div className="mt-1.5 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-1.5 animate-in fade-in duration-150">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Cartão SUS duplicado:</strong> Este CNS já pertence a <strong>{duplicateCnsPatient.fullName}</strong>. O Cartão SUS deve ser único para cada paciente.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Logo abaixo: Nome Completo do Paciente * */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nome Completo do Paciente <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    id="patient-fullname-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onBlur={(e) => setFullName(formatName(e.target.value))}
                    placeholder="Ex: Lucas Henrique de Oliveira"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              {/* Data de Nascimento + Cálculo Cronológico em Tempo Real */}
              <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/40 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-teal-950 dark:text-teal-200 block mb-1">
                      Data de Nascimento <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="date"
                        required
                        id="patient-birthdate-input"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-800 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-teal-950 dark:text-teal-200 block mb-1">
                      Sexo / Gênero
                    </label>
                    <select
                      value={gender}
                      onChange={(e) =>
                        setGender(e.target.value as 'Feminino' | 'Masculino' | 'Outro')
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-800 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Outro">Outro / Não Declarado</option>
                    </select>
                  </div>
                </div>

                {/* Real-time Chronological Age Display */}
                {birthDate && (
                  <div
                    id="chronological-age-preview"
                    className="flex items-center gap-2 p-3 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-teal-500/30 text-xs shadow-xs"
                  >
                    {calculatedAge.isMinor ? (
                      <Baby className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    )}
                    <div className="flex-1">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                        Idade Cronológica Exata (Puericultura / APS):
                      </span>
                      <span className="font-extrabold text-teal-800 dark:text-teal-300 text-sm">
                        {calculatedAge.formatted}
                      </span>
                    </div>
                    {calculatedAge.isMinor && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-500/20">
                        Menor de Idade
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Responsável Legal (Obrigatório / Destacado para menores ou dependentes) */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  calculatedAge.isMinor
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/40'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <HeartHandshake className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Responsável Legal / Cuidador
                    {calculatedAge.isMinor && (
                      <span className="ml-2 text-[10px] font-normal text-amber-600 dark:text-amber-400">
                        (Recomendado para menores de idade)
                      </span>
                    )}
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Nome do Responsável Legal
                    </label>
                    <input
                      type="text"
                      id="legal-guardian-name-input"
                      value={legalGuardianName}
                      onChange={(e) => setLegalGuardianName(e.target.value)}
                      onBlur={(e) => setLegalGuardianName(formatName(e.target.value))}
                      placeholder="Ex: Juliana de Oliveira Santos"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Grau de Parentesco
                    </label>
                    <select
                      id="guardian-kinship-select"
                      value={guardianKinship}
                      onChange={(e) => setGuardianKinship(e.target.value as KinshipType)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                      {KINSHIP_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Especificar se for 'Outro' */}
                {guardianKinship === 'Outro' && (
                  <div className="mt-2.5">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Especifique o Parentesco / Vínculo:
                    </label>
                    <input
                      type="text"
                      id="guardian-kinship-custom-input"
                      value={guardianKinshipCustom}
                      onChange={(e) => setGuardianKinshipCustom(e.target.value)}
                      onBlur={(e) => setGuardianKinshipCustom(formatName(e.target.value))}
                      placeholder="Ex: Vizinho cuidador, Irmão de criação, etc."
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Telefone de Contato */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Telefone de Contato
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    id="patient-phone-input"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                    placeholder="(91) 98595-8041"
                    maxLength={15}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Vínculo Territorial: UBS Referência, Contato e ACS, Contato */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Vínculo Territorial e Atenção Primária
                  </h4>
                </div>

                {/* Linha 1: UBS Referência (Busca Inteligente) e Contato */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Campo de Busca Inteligente: UBS Referência */}
                  <div ref={ubsRef} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        UBS Referência
                      </label>
                      {registeredUbsOptions.length > 0 && (
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                          {registeredUbsOptions.length} cadastrada(s)
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        id="patient-reference-ubs-input"
                        value={referenceUbs}
                        onChange={(e) => {
                          setReferenceUbs(e.target.value);
                          setIsUbsOpen(true);
                        }}
                        onFocus={() => {
                          setIsUbsOpen(true);
                          setIsAcsOpen(false);
                        }}
                        onClick={() => {
                          setIsUbsOpen(true);
                          setIsAcsOpen(false);
                        }}
                        placeholder="Buscar ou cadastrar nova UBS..."
                        className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsUbsOpen((prev) => !prev);
                          setIsAcsOpen(false);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        tabIndex={-1}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Dropdown de Busca Inteligente da UBS */}
                    {isUbsOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 py-1 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredUbsOptions.length > 0 ? (
                          filteredUbsOptions.map((opt) => {
                            const isSelected = referenceUbs.trim().toLowerCase() === opt.name.toLowerCase();
                            return (
                              <button
                                key={`ubs-opt-${opt.name}`}
                                type="button"
                                onClick={() => handleSelectUbs(opt)}
                                className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-teal-50/90 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-semibold'
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <span className="truncate">{opt.name}</span>
                                {opt.contact && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono shrink-0">
                                    {opt.contact}
                                  </span>
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-2 text-slate-400 text-xs italic">
                            Nenhuma UBS encontrada com esse nome.
                          </div>
                        )}

                        {/* Opção para cadastrar novo dado digitado se não estiver na lista */}
                        {referenceUbs.trim().length > 0 &&
                          !registeredUbsOptions.some(
                            (o) => o.name.toLowerCase() === referenceUbs.trim().toLowerCase()
                          ) && (
                            <button
                              type="button"
                              onClick={() => setIsUbsOpen(false)}
                              className="w-full text-left px-3 py-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">
                                Cadastrar nova: <strong>"{referenceUbs.trim()}"</strong>
                              </span>
                            </button>
                          )}
                      </div>
                    )}
                  </div>

                  {/* Campo de Contato da UBS */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Contato
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        id="patient-reference-ubs-contact-input"
                        value={referenceUbsContact}
                        onChange={(e) => setReferenceUbsContact(formatPhoneBR(e.target.value))}
                        placeholder="(91) 98595-8041"
                        maxLength={15}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Linha 2: ACS (Busca Inteligente) e Contato */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Campo de Busca Inteligente: ACS */}
                  <div ref={acsRef} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        ACS
                      </label>
                      {registeredAcsOptions.length > 0 && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {registeredAcsOptions.length} cadastrado(s)
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        id="patient-acs-name-input"
                        value={acsName}
                        onChange={(e) => {
                          setAcsName(e.target.value);
                          setIsAcsOpen(true);
                        }}
                        onFocus={() => {
                          setIsAcsOpen(true);
                          setIsUbsOpen(false);
                        }}
                        onClick={() => {
                          setIsAcsOpen(true);
                          setIsUbsOpen(false);
                        }}
                        placeholder="Buscar ou cadastrar novo(a) ACS..."
                        className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsAcsOpen((prev) => !prev);
                          setIsUbsOpen(false);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        tabIndex={-1}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Dropdown de Busca Inteligente de ACS */}
                    {isAcsOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 py-1 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredAcsOptions.length > 0 ? (
                          filteredAcsOptions.map((opt) => {
                            const isSelected = acsName.trim().toLowerCase() === opt.name.toLowerCase();
                            return (
                              <button
                                key={`acs-opt-${opt.name}`}
                                type="button"
                                onClick={() => handleSelectAcs(opt)}
                                className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <span className="truncate">{opt.name}</span>
                                {opt.contact && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono shrink-0">
                                    {opt.contact}
                                  </span>
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-2 text-slate-400 text-xs italic">
                            Nenhum ACS encontrado com esse nome.
                          </div>
                        )}

                        {/* Opção para cadastrar novo dado digitado se não estiver na lista */}
                        {acsName.trim().length > 0 &&
                          !registeredAcsOptions.some(
                            (o) => o.name.toLowerCase() === acsName.trim().toLowerCase()
                          ) && (
                            <button
                              type="button"
                              onClick={() => setIsAcsOpen(false)}
                              className="w-full text-left px-3 py-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">
                                Cadastrar novo(a): <strong>"{acsName.trim()}"</strong>
                              </span>
                            </button>
                          )}
                      </div>
                    )}
                  </div>

                  {/* Campo de Contato do ACS */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Contato
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        id="patient-acs-contact-input"
                        value={acsContact}
                        onChange={(e) => setAcsContact(formatPhoneBR(e.target.value))}
                        placeholder="(91) 98595-8041"
                        maxLength={15}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção Sanfonada: Dados Cadastrais Complementares (SUS / BPA & Banco 2) */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
                <button
                  type="button"
                  onClick={() => setIsExtendedSectionOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between p-3.5 text-left text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Dados Cadastrais Complementares (SUS / BPA & Banco 2)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 font-semibold">
                      CEP, Logradouro, Raça, Etnia
                    </span>
                  </div>
                  {isExtendedSectionOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {isExtendedSectionOpen && (
                  <div className="p-4 pt-1 space-y-3.5 border-t border-slate-200 dark:border-slate-800 text-xs animate-in fade-in duration-200">
                    {/* Linha 1: CEP (com busca automática ViaCEP) e Cód. IBGE */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          CEP (com busca automática)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={zipCode}
                            onChange={(e) => {
                              const val = e.target.value;
                              setZipCode(val);
                              const clean = val.replace(/\D/g, '');
                              if (clean.length === 8) {
                                handleFetchCep(clean);
                              }
                            }}
                            placeholder="00000-000"
                            className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleFetchCep()}
                            disabled={isSearchingCep}
                            className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Search className="w-3.5 h-3.5" />
                            <span>{isSearchingCep ? 'Buscando...' : 'Buscar CEP'}</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                            Cód. Município (IBGE)
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">6 dígitos</span>
                        </div>
                        <input
                          type="text"
                          maxLength={6}
                          value={codMunicipio}
                          onChange={(e) => setCodMunicipio(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Ex: 150070"
                          title="Código do Município IBGE (6 dígitos, sem o dígito verificador)"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Linha 2: Tipo Logradouro (street_types_catalog.name) e Cód. Logradouro (street_types_catalog.code) */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      {/* Componente 1: Tipo Logradouro - Lista simples somente com texto, espaçamento mínimo, busca inteligente no próprio campo */}
                      <div ref={streetTypeRef} className="relative">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                            Tipo Logradouro
                          </label>
                          {isLoadingStreetTypes && (
                            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">BD2...</span>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            value={streetType}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStreetType(val);
                              setStreetTypeFilter(val);
                              setIsStreetTypeOpen(true);
                              const match = streetTypesCatalog.find(
                                (st) => st.name.trim().toLowerCase() === val.trim().toLowerCase()
                              );
                              if (match) {
                                setStreetCode(match.code);
                              }
                            }}
                            onClick={() => {
                              setIsStreetTypeOpen(true);
                              setIsStreetCodeOpen(false);
                              setStreetTypeFilter("");
                            }}
                            onFocus={() => {
                              setIsStreetTypeOpen(true);
                              setIsStreetCodeOpen(false);
                              setStreetTypeFilter("");
                            }}
                            placeholder="Ex: Rua, Avenida..."
                            className="w-full px-3 py-2 pr-8 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIsStreetTypeOpen((prev) => !prev);
                              setIsStreetCodeOpen(false);
                              setStreetTypeFilter("");
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            tabIndex={-1}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Dropdown suspenso para Tipo Logradouro: apenas texto em lista simples com espaçamento mínimo */}
                        {isStreetTypeOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 py-0.5 text-xs">
                            {filteredStreetTypeOptions.length === 0 ? (
                              <div className="px-3 py-1.5 text-center text-slate-400 text-xs">
                                Nenhum tipo encontrado
                              </div>
                            ) : (
                              filteredStreetTypeOptions.map((item) => {
                                const isSelected = streetType.trim().toLowerCase() === item.name.toLowerCase();
                                return (
                                  <button
                                    key={`type-${item.code}-${item.name}`}
                                    type="button"
                                    onClick={() => handleSelectStreetType(item)}
                                    className={`w-full text-left px-2.5 py-1 text-xs truncate transition-colors cursor-pointer block ${
                                      isSelected
                                        ? "bg-teal-50/90 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-semibold"
                                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }`}
                                  >
                                    {item.name}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>

                      {/* Componente 2: Cód. Logradouro - Lista simples com apenas códigos em números, espaçamento mínimo */}
                      <div ref={streetCodeRef} className="relative">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Cód. Logradouro
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={streetCode}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStreetCode(val);
                              setStreetCodeFilter(val);
                              setIsStreetCodeOpen(true);
                              const match = streetTypesCatalog.find(
                                (st) => st.code.trim() === val.trim()
                              );
                              if (match) {
                                setStreetType(match.name);
                              }
                            }}
                            onClick={() => {
                              setIsStreetCodeOpen(true);
                              setIsStreetTypeOpen(false);
                              setStreetCodeFilter("");
                            }}
                            onFocus={() => {
                              setIsStreetCodeOpen(true);
                              setIsStreetCodeOpen(false);
                              setStreetCodeFilter("");
                            }}
                            placeholder="Ex: 081"
                            className="w-full px-3 py-2 pr-8 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono focus:ring-2 focus:ring-teal-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIsStreetCodeOpen((prev) => !prev);
                              setIsStreetTypeOpen(false);
                              setStreetCodeFilter("");
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            tabIndex={-1}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Dropdown suspenso para Cód. Logradouro: apenas códigos numéricos em lista simples com espaçamento mínimo */}
                        {isStreetCodeOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl z-50 py-0.5 text-xs font-mono">
                            {filteredStreetCodeOptions.length === 0 ? (
                              <div className="px-3 py-1.5 text-center text-slate-400 text-xs font-sans">
                                Nenhum código
                              </div>
                            ) : (
                              filteredStreetCodeOptions.map((item) => {
                                const isSelected = streetCode.trim() === item.code.trim();
                                return (
                                  <button
                                    key={`code-${item.code}-${item.name}`}
                                    type="button"
                                    onClick={() => handleSelectStreetCode(item)}
                                    className={`w-full text-left px-2.5 py-1 text-xs truncate transition-colors cursor-pointer block ${
                                      isSelected
                                        ? "bg-teal-50/90 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-semibold"
                                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }`}
                                  >
                                    {item.code}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Logradouro / Rua
                        </label>
                        <input
                          type="text"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                          onBlur={(e) => setStreet(formatName(e.target.value))}
                          placeholder="Nome da Rua ou Avenida"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Linha 3: Número, Complemento, Bairro, Cidade */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Número
                        </label>
                        <input
                          type="text"
                          value={number}
                          onChange={(e) => setNumber(e.target.value)}
                          placeholder="Ex: 123 ou S/N"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Complemento
                        </label>
                        <input
                          type="text"
                          value={complement}
                          onChange={(e) => setComplement(e.target.value)}
                          placeholder="Apto, Bloco..."
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Bairro
                        </label>
                        <input
                          type="text"
                          value={neighborhood}
                          onChange={(e) => setNeighborhood(e.target.value)}
                          onBlur={(e) => setNeighborhood(formatName(e.target.value))}
                          placeholder="Bairro"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Município
                        </label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          onBlur={(e) => setCity(formatName(e.target.value))}
                          placeholder="Cidade"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Linha 4: Raça/Cor, Etnia, Nacionalidade e E-mail */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Raça / Cor
                        </label>
                        <select
                          value={race}
                          onChange={(e) => setRace(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                        >
                          <option value="Branca">Branca</option>
                          <option value="Preta">Preta</option>
                          <option value="Parda">Parda</option>
                          <option value="Amarela">Amarela</option>
                          <option value="Indígena">Indígena</option>
                          <option value="Sem Informação">Sem Informação</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Etnia (ex: Ribeirinho)
                        </label>
                        <input
                          type="text"
                          value={ethnicity}
                          onChange={(e) => setEthnicity(e.target.value)}
                          placeholder="Ex: Ribeirinho..."
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Nacionalidade
                        </label>
                        <input
                          type="text"
                          value={nationality}
                          onChange={(e) => setNationality(e.target.value)}
                          placeholder="Brasileira"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          E-mail
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="paciente@email.com"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                {(duplicateCnsPatient || duplicateCpfPatient) ? (
                  <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>Corrija o {duplicateCnsPatient ? 'Cartão SUS' : 'CPF'} duplicado antes de salvar.</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 hidden sm:block">
                    * CNS e CPF são documentos únicos e protegidos contra duplicidades.
                  </div>
                )}

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    id="save-patient-submit-btn"
                    disabled={Boolean(duplicateCnsPatient || duplicateCpfPatient)}
                    className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 ${
                      duplicateCnsPatient || duplicateCpfPatient
                        ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-teal-600/20 cursor-pointer'
                    }`}
                    title={
                      duplicateCnsPatient || duplicateCpfPatient
                        ? 'Não é permitido cadastrar CNS ou CPF já existentes'
                        : 'Salvar dados do cidadão no banco de dados e abrir acolhimento na Fila de Atendimento'
                    }
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Salvar/Add Fila</span>
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
