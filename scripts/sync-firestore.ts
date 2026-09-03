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

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const ADMIN_MASTER_EMAIL = 'jerime.rego@gmail.com';

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
  console.log('🔄 Conectando ao Firestore na base:', firebaseConfig.firestoreDatabaseId);

  // 1. Atualizar todos os usuários na coleção users
  console.log('👥 Atualizando campos de assinatura nos usuários existentes...');
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log(`  Total de usuários encontrados: ${usersSnap.size}`);

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const isAdmin =
      data.email?.toLowerCase().trim() === ADMIN_MASTER_EMAIL.toLowerCase() ||
      data.role === 'admin';

    const updates: Record<string, any> = {
      subscription_status: isAdmin ? 'pago' : (data.subscription_status || 'free'),
      free_used: isAdmin ? true : (data.free_used ?? false),
    };

    if (isAdmin) {
      updates.subscription_expires_at = new Date('2099-12-31T23:59:59.999Z').getTime();
      updates.plan_name = 'Administrador Vitalício';
    }

    await setDoc(doc(db, 'users', userDoc.id), updates, { merge: true });
    console.log(
      `  ✅ Usuário atualizado: ${data.name || userDoc.id} (${data.email}) -> Status: ${updates.subscription_status}, Free Usado: ${updates.free_used}`
    );
  }

  // 2. Tentar sincronizar subscription_plans
  try {
    console.log('📦 Sincronizando coleção subscription_plans...');
    for (const plan of DEFAULT_PLANS) {
      const planRef = doc(db, 'subscription_plans', plan.id);
      await setDoc(planRef, plan, { merge: true });
      console.log(`  ✅ Plano ${plan.name} sincronizado.`);
    }
  } catch (err: any) {
    console.warn('⚠️ Nota sobre subscription_plans (as regras do Firebase precisam ser publicadas no console):', err?.message);
  }

  console.log('🎉 Sincronização concluída com sucesso!');
  process.exit(0);
}

runSync().catch((err) => {
  console.error('❌ Erro na sincronização:', err);
  process.exit(1);
});
