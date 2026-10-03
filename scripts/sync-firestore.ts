import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const rawFirebaseConfig = firebaseConfig as Record<string, any>;
const app = initializeApp(firebaseConfig);
const db = rawFirebaseConfig.firestoreDatabaseId
  ? getFirestore(app, rawFirebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Get optional admin email from command line args: e.g. `npx tsx scripts/sync-firestore.ts meu-email@gmail.com`
const targetAdminEmail = process.argv[2]?.trim().toLowerCase() || '';

const DEFAULT_ADMINS = ['jerime.rego@gmail.com'];
if (targetAdminEmail && !DEFAULT_ADMINS.includes(targetAdminEmail)) {
  DEFAULT_ADMINS.push(targetAdminEmail);
}

const DATA_STORE_DIR = path.join(process.cwd(), 'data-store');

function readJsonFile(filename: string, fallback: any = []): any {
  try {
    const filePath = path.join(DATA_STORE_DIR, filename);
    if (!fs.existsSync(filePath)) return fallback;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.warn(`[Sync] Erro ao ler ${filename}:`, err);
    return fallback;
  }
}

const DEFAULT_PLANS = [
  {
    id: 'por_hora',
    name: 'Plano por Hora (60m)',
    price: 3.00,
    durationDays: 1 / 24,
    description: 'Acesso completo por 1 hora de uso.',
    badge: 'Uso Rápido',
    features: [
      'Geração ilimitada de prontuários por 1 hora',
      'Ideal para testar ou uso pontual',
      'Gravação de voz e anexos',
    ],
    active: true,
  },
  {
    id: 'semanal',
    name: 'Plano Semanal',
    price: 5.00,
    durationDays: 7,
    description: 'Acesso completo durante 7 dias corridos.',
    badge: 'Curto Prazo',
    features: [
      'Geração ilimitada de prontuários',
      'Validade de 7 dias corridos',
      'Histórico e Linha do Tempo',
    ],
    active: true,
  },
  {
    id: 'quinzenal',
    name: 'Plano Quinzenal',
    price: 13.90,
    durationDays: 15,
    description: 'Acesso completo para 15 dias de atendimentos.',
    badge: 'Flexível',
    features: [
      'Geração ilimitada de prontuários',
      'Gravação de voz e anexos de exames/receitas',
      'Adequação e-SUS PEC para todas as profissões',
      'Validade de 15 dias corridos',
    ],
    active: true,
  },
  {
    id: 'mensal',
    name: 'Plano Mensal',
    price: 19.90,
    durationDays: 30,
    description: 'O mais escolhido para a rotina diária das unidades.',
    badge: 'Mais Popular',
    features: [
      'Geração ilimitada de prontuários',
      'Gravação de voz e anexos de exames/receitas',
      'Histórico completo e Linha do Tempo',
      'Auditoria de Evolução Clínica Longitudinal com IA',
      'Validade de 30 dias corridos',
    ],
    active: true,
  },
  {
    id: 'anual',
    name: 'Plano Anual',
    price: 199.90,
    durationDays: 365,
    description: 'Máxima economia e tranquilidade para o ano todo.',
    badge: 'Melhor Custo-Benefício',
    features: [
      'Geração ilimitada durante 365 dias',
      'Economia equivalente a 2 meses grátis',
      'Acesso antecipado a novos modelos de IA',
      'Todas as atualizações do sistema incluídas',
      'Suporte prioritário',
    ],
    active: true,
  },
];

async function runSync() {
  console.log('====================================================');
  console.log('🚀 INICIANDO SINCRONIZAÇÃO COMPLETA DO FIRESTORE');
  console.log(`📁 Projeto: ${rawFirebaseConfig.projectId}`);
  console.log(`💾 Base: ${rawFirebaseConfig.firestoreDatabaseId || '(default)'}`);
  if (targetAdminEmail) {
    console.log(`👑 Novo Administrador Solicitado: ${targetAdminEmail}`);
  }
  console.log('====================================================\n');

  // 1. Sincronizar System Settings
  console.log('⚙️ Sincronizando Configurações Globais (system_settings)...');
  const settingsData = readJsonFile('settings.json', null);
  if (settingsData && typeof settingsData === 'object') {
    const settingsPayload = {
      ...settingsData,
      updatedAt: Date.now(),
      updatedBy: targetAdminEmail || settingsData.updatedBy || DEFAULT_ADMINS[0],
    };
    await setDoc(doc(db, 'system_settings', 'global'), settingsPayload, { merge: true });
    console.log('  ✅ Configurações globais (chaves de API, webhooks e parâmetros do PEC) salvas com sucesso.');
  }

  // 2. Sincronizar Planos de Assinatura
  console.log('📦 Sincronizando Planos de Assinatura (subscription_plans)...');
  for (const plan of DEFAULT_PLANS) {
    await setDoc(doc(db, 'subscription_plans', plan.id), plan, { merge: true });
  }
  console.log(`  ✅ ${DEFAULT_PLANS.length} planos sincronizados.`);

  // 3. Sincronizar Usuários da Equipe
  console.log('👥 Sincronizando Usuários da Equipe (users)...');
  const usersList: any[] = readJsonFile('users.json', []);
  let userCount = 0;

  for (const u of usersList) {
    if (!u || !u.id) continue;
    const emailLower = (u.email || '').toLowerCase().trim();
    const isMaster = DEFAULT_ADMINS.includes(emailLower) || u.role === 'admin';

    const updates: Record<string, any> = {
      ...u,
      role: isMaster ? 'admin' : (u.role || 'user'),
      subscription_status: isMaster ? 'pago' : (u.subscription_status || 'free'),
      free_used: isMaster ? true : (u.free_used ?? false),
    };

    if (isMaster) {
      updates.subscription_expires_at = new Date('2099-12-31T23:59:59.999Z').getTime();
      updates.plan_name = 'Administrador Vitalício';
    }

    await setDoc(doc(db, 'users', u.id), updates, { merge: true });
    userCount++;
  }

  // Se foi fornecido um novo admin que ainda não existe no users.json, criá-lo
  if (targetAdminEmail) {
    const exists = usersList.some((u) => (u.email || '').toLowerCase().trim() === targetAdminEmail);
    if (!exists) {
      const newAdminId = `user-admin-${targetAdminEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '')}`;
      await setDoc(
        doc(db, 'users', newAdminId),
        {
          id: newAdminId,
          name: targetAdminEmail.split('@')[0],
          email: targetAdminEmail,
          role: 'admin',
          subscription_status: 'pago',
          subscription_expires_at: new Date('2099-12-31T23:59:59.999Z').getTime(),
          plan_name: 'Administrador Vitalício',
          free_used: true,
          profession: 'enfermeiro',
          workplace: 'Atenção Primária à Saúde',
          createdAt: Date.now(),
        },
        { merge: true }
      );
      console.log(`  👑 Novo administrador criado na coleção users: ${targetAdminEmail}`);
    }
  }
  console.log(`  ✅ ${userCount} usuários sincronizados.`);

  // 4. Sincronizar Pacientes
  console.log('🩺 Sincronizando Pacientes (patients)...');
  const patientsList: any[] = readJsonFile('patients.json', []);
  let patCount = 0;
  for (const p of patientsList) {
    if (!p || !p.id) continue;
    await setDoc(doc(db, 'patients', p.id), p, { merge: true });
    patCount++;
  }
  console.log(`  ✅ ${patCount} pacientes sincronizados com o Cloud Firestore.`);

  // 5. Sincronizar Consultas / Prontuários PEC
  console.log('📋 Sincronizando Atendimentos e Prontuários (consultations)...');
  const consultationsList: any[] = readJsonFile('consultations.json', []);
  let consCount = 0;
  for (const c of consultationsList) {
    if (!c || !c.id) continue;
    await setDoc(doc(db, 'consultations', c.id), c, { merge: true });
    consCount++;
  }
  console.log(`  ✅ ${consCount} prontuários/consultas sincronizados com o Cloud Firestore.`);

  // 6. Sincronizar Agendamentos
  console.log('📅 Sincronizando Agendamentos (appointments)...');
  const appointmentsList: any[] = readJsonFile('appointments.json', []);
  let apptCount = 0;
  for (const a of appointmentsList) {
    if (!a || !a.id) continue;
    await setDoc(doc(db, 'appointments', a.id), a, { merge: true });
    apptCount++;
  }
  console.log(`  ✅ ${apptCount} agendamentos sincronizados.`);

  console.log('\n====================================================');
  console.log('🎉 BANCO DE DADOS POPULADO E SINCRONIZADO COM SUCESSO!');
  console.log(`Total: ${patCount} pacientes, ${consCount} consultas, ${userCount} usuários, configurações e planos.`);
  console.log('====================================================\n');

  process.exit(0);
}

runSync().catch((err) => {
  console.error('❌ Erro na sincronização:', err);
  process.exit(1);
});
