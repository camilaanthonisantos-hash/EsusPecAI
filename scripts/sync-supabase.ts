import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ejsvpdecoxqqebipybiz.supabase.co';
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqc3ZwZGVjb3hxcWViaXB5Yml6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTA0NTY4OSwiZXhwIjoyMTA2NjIxNjg5fQ.g4lEjCA-9tmuvny1Gpsok4n9d5VdoStNNlqsKvosVg8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

const DATA_STORE_DIR = path.join(process.cwd(), 'data-store');

function readStore(name: string): any {
  const file = path.join(DATA_STORE_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`Erro ao ler ${name}.json:`, err);
    return [];
  }
}

async function syncAllToSupabase() {
  console.log('====================================================');
  console.log('INICIANDO MIGRAÇÃO COMPLETA DE DADOS PARA O SUPABASE');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log('====================================================\n');

  const report: Record<string, { total: number; success: number; errors: number }> = {};

  // 1. USUÁRIOS
  const users = readStore('users');
  report.users = { total: users.length, success: 0, errors: 0 };
  console.log(`[1/8] Sincronizando ${users.length} usuários e profissionais...`);
  for (const u of users) {
    if (!u || !u.id) continue;
    const payload = {
      id: String(u.id),
      name: u.name || null,
      email: u.email || null,
      role: u.role || 'user',
      profession: u.profession || null,
      council_register: u.councilRegister || null,
      specialty: u.specialty || null,
      workplace: u.workplace || null,
      subscription_status: u.subscription_status || 'free',
      subscription_expires_at: u.subscription_expires_at || null,
      plan_name: u.plan_name || null,
      free_used: Boolean(u.free_used),
      raw_data: u,
      created_at: u.createdAt || Date.now(),
      updated_at: u.updatedAt || Date.now(),
    };
    const { error } = await supabase.from('users').upsert(payload);
    if (!error) {
      report.users.success++;
    } else {
      report.users.errors++;
      console.warn(` - Erro no usuário ${u.id}:`, error.message);
    }
  }

  // 2. PACIENTES
  const patients = readStore('patients');
  report.patients = { total: patients.length, success: 0, errors: 0 };
  console.log(`[2/8] Sincronizando ${patients.length} pacientes...`);
  for (const p of patients) {
    if (!p || !p.id) continue;
    const payload = {
      id: String(p.id),
      full_name: p.fullName || p.name || 'Paciente',
      cpf: p.cpf || null,
      cns: p.cns || null,
      phone: p.phone || null,
      birth_date: p.birthDate || null,
      gender: p.gender || null,
      mother_name: p.legalGuardianName || p.motherName || null,
      address: p.address || null,
      balance: p.balance || 0,
      raw_data: p,
      created_at: p.createdAt || Date.now(),
      updated_at: p.updatedAt || Date.now(),
    };
    const { error } = await supabase.from('patients').upsert(payload);
    if (!error) {
      report.patients.success++;
    } else {
      report.patients.errors++;
      console.warn(` - Erro no paciente ${p.fullName || p.id}:`, error.message);
    }
  }

  // 3. CONSULTAS E PRONTUÁRIOS (SOAP)
  const consultations = readStore('consultations');
  report.consultations = { total: consultations.length, success: 0, errors: 0 };
  console.log(`[3/8] Sincronizando ${consultations.length} atendimentos clínicos e prontuários...`);
  for (const c of consultations) {
    if (!c || !c.id) continue;
    const payload = {
      id: String(c.id),
      patient_id: c.patientId || null,
      patient_name: c.patientName || null,
      author: c.author || c.authorName || null,
      profession: c.authorProfession || c.profession || null,
      date: c.date || null,
      timestamp: c.timestamp || Date.now(),
      avaliacao: c.avaliacao || null,
      plano: c.plano || null,
      conduta: c.conduta || null,
      raw_notes: c.rawNotes || null,
      ciap2: c.ciap2 || null,
      cid10: c.cid10 || null,
      diagnostic_hypothesis: c.diagnosticHypothesis || null,
      vital_signs: c.vitalSigns || null,
      prescription: c.prescription || null,
      exam_request: c.examRequest || null,
      referral: c.referral || null,
      medical_report: c.medicalReport || null,
      attendance_certificate: c.attendanceCertificate || null,
      pts: c.pts || null,
      raw_data: c,
      created_at: c.createdAt || c.timestamp || Date.now(),
      updated_at: c.updatedAt || Date.now(),
    };
    const { error } = await supabase.from('consultations').upsert(payload);
    if (!error) {
      report.consultations.success++;
    } else {
      report.consultations.errors++;
      console.warn(` - Erro na consulta ${c.id}:`, error.message);
    }
  }

  // 4. EVOLUÇÕES CLÍNICAS LONGITUDINAIS (IA)
  const clinicalEvolutions = readStore('clinical_evolutions');
  report.clinical_evolutions = { total: clinicalEvolutions.length, success: 0, errors: 0 };
  console.log(`[4/8] Sincronizando ${clinicalEvolutions.length} evoluções longitudinais...`);
  for (const e of clinicalEvolutions) {
    if (!e || (!e.patientId && !e.id)) continue;
    const patId = e.patientId || e.id;
    const payload = {
      id: String(patId),
      patient_id: String(patId),
      patient_name: e.patientName || null,
      generated_at: e.generatedAt || Date.now(),
      model_used: e.modelUsed || null,
      resumo_longitudinal: e.resumoLongitudinal || null,
      condicoes_saude: e.condicoesSaude || null,
      farmacoterapia: e.farmacoterapia || null,
      trajetoria_clinica: e.trajetoriaClinica || null,
      matriz_evolucao: e.matrizEvolucao || null,
      condutas_realizadas: e.condutasRealizadas || null,
      faltas_e_abandonos: e.faltasEAbandonos || null,
      pontos_alerta_recomendacoes: e.pontosAlertaRecomendacoes || null,
      raw_markdown: e.rawMarkdown || null,
      raw_data: e,
    };
    const { error } = await supabase.from('clinical_evolutions').upsert(payload);
    if (!error) {
      report.clinical_evolutions.success++;
    } else {
      report.clinical_evolutions.errors++;
      console.warn(` - Erro na evolução ${patId}:`, error.message);
    }
  }

  // 5. AGENDAMENTOS
  const appointments = readStore('appointments');
  report.appointments = { total: appointments.length, success: 0, errors: 0 };
  console.log(`[5/8] Sincronizando ${appointments.length} agendamentos...`);
  for (const a of appointments) {
    if (!a || !a.id) continue;
    const payload = {
      id: String(a.id),
      patient_id: a.patientId || null,
      patient_name: a.patientName || null,
      patient_phone: a.patientPhone || null,
      patient_email: a.patientEmail || null,
      patient_cpf: a.patientCpf || null,
      professional_id: a.professionalId || null,
      professional_name: a.professionalName || null,
      professional_profession: a.professionalProfession || null,
      date: a.date || null,
      start_time: a.startTime || null,
      end_time: a.endTime || null,
      service_name: a.serviceName || null,
      service_price: a.servicePrice || 0,
      payment_method: a.paymentMethod || null,
      payment_status: a.paymentStatus || 'isento',
      status: a.status || 'agendado',
      notifications: a.notifications || null,
      raw_data: a,
      created_at: a.createdAt || Date.now(),
      updated_at: a.updatedAt || Date.now(),
    };
    const { error } = await supabase.from('appointments').upsert(payload);
    if (!error) {
      report.appointments.success++;
    } else {
      report.appointments.errors++;
      console.warn(` - Erro no agendamento ${a.id}:`, error.message);
    }
  }

  // 6. FILA DE RECEPÇÃO E ACOLHIMENTO
  const queue = readStore('reception_queue');
  report.reception_queue = { total: queue.length, success: 0, errors: 0 };
  console.log(`[6/8] Sincronizando ${queue.length} registros da fila de recepção...`);
  for (const q of queue) {
    if (!q || !q.id) continue;
    const payload = {
      id: String(q.id),
      patient_id: q.patientId || null,
      patient_name: q.patientName || null,
      patient_cpf: q.patientCpf || null,
      patient_cns: q.patientCns || null,
      risk_priority: q.riskPriority || 'verde',
      risk_category: q.riskCategory || null,
      status: q.status || 'waiting',
      timestamp: q.timestamp || Date.now(),
      called_at: q.calledAt || null,
      attended_at: q.attendedAt || null,
      professional_name: q.professionalName || null,
      room_name: q.roomName || null,
      raw_data: q,
      created_at: q.createdAt || Date.now(),
      updated_at: q.updatedAt || Date.now(),
    };
    const { error } = await supabase.from('reception_queue').upsert(payload);
    if (!error) {
      report.reception_queue.success++;
    } else {
      report.reception_queue.errors++;
      console.warn(` - Erro na fila ${q.id}:`, error.message);
    }
  }

  // 7. CONFIGURAÇÕES DO SISTEMA
  const settings = readStore('settings');
  report.settings = { total: 1, success: 0, errors: 0 };
  console.log(`[7/8] Sincronizando configurações globais do sistema...`);
  const { error: setErr } = await supabase.from('system_settings').upsert({
    id: 'global',
    data: settings,
    updated_at: Date.now(),
  });
  if (!setErr) {
    report.settings.success = 1;
  } else {
    report.settings.errors = 1;
    console.warn(` - Erro nas configurações:`, setErr.message);
  }

  // 8. ASSINATURAS E TRANSAÇÕES PIX
  const subscriptions = readStore('subscriptions');
  report.subscriptions = { total: subscriptions.length, success: 0, errors: 0 };
  console.log(`[8/8] Sincronizando ${subscriptions.length} assinaturas/transações PIX...`);
  for (const s of subscriptions) {
    if (!s || !s.id) continue;
    const payload = {
      id: String(s.id),
      user_id: s.userId || null,
      order_id: s.orderId || null,
      user_name: s.userName || null,
      email: s.email || null,
      plan_id: s.planId || null,
      plan_name: s.planName || null,
      amount: s.amount || null,
      status: s.status || null,
      pix_copia_e_cola: s.pixCopiaECola || null,
      pix_qr_code: s.pixQrCode || null,
      pix_id: s.pixId || null,
      expires_at: s.expiresAt || null,
      created_at: s.createdAt || Date.now(),
      updated_at: s.updatedAt || Date.now(),
      raw_data: s,
    };
    const { error } = await supabase.from('subscriptions').upsert(payload);
    if (!error) {
      report.subscriptions.success++;
    } else {
      report.subscriptions.errors++;
      console.warn(` - Erro na assinatura ${s.id}:`, error.message);
    }
  }

  console.log('\n====================================================');
  console.log('RESUMO DA MIGRAÇÃO PARA O SUPABASE:');
  console.log('====================================================');
  console.table(report);
  console.log('Migração finalizada!');
}

syncAllToSupabase().catch(console.error);
