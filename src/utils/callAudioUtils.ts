/**
 * Audio synthesis helper for Brazilian Public Health / Hospital Call chime & speech
 */

export function playHospitalCallChime(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // First Bell Tone: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.22, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Second Bell Tone (higher harmonic): 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.28);
    gain2.gain.setValueAtTime(0.28, now + 0.28);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.28);
    osc2.stop(now + 1.2);
  } catch (e) {
    console.warn('Hospital chime audio could not be played:', e);
  }
}

export function speakPatientCall(
  patientName: string,
  professionalName?: string,
  officeOrSpecialty?: string,
  cycleNumber?: number
): void {
  try {
    if (!('speechSynthesis' in window) || !patientName) return;

    window.speechSynthesis.cancel();

    let prefix = 'Atenção:';
    if (cycleNumber === 2) prefix = 'Segunda chamada:';
    if (cycleNumber === 3) prefix = 'Última chamada:';

    let text = `${prefix} ${patientName}.`;
    if (professionalName && officeOrSpecialty) {
      text += ` Favor dirigir-se ao consultório de ${professionalName}, ${officeOrSpecialty}.`;
    } else if (professionalName) {
      text += ` Favor dirigir-se ao consultório de ${professionalName}.`;
    } else {
      text += ` Favor dirigir-se ao consultório de atendimento.`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.92;
    utterance.pitch = 1.05;

    // Slight delay after chime
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 450);
  } catch (e) {
    console.warn('Text-to-speech could not be played:', e);
  }
}

export function announcePatientCall(
  patientName: string,
  professionalName?: string,
  officeOrSpecialty?: string,
  cycleNumber?: number
): void {
  playHospitalCallChime();
  speakPatientCall(patientName, professionalName, officeOrSpecialty, cycleNumber);
}

/**
 * Pleasant, non-intrusive notification chime when a patient replies on WhatsApp CRM in real time
 */
export function playWhatsAppMessageChime(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Friendly 2-tone melodic chime: G5 (784Hz) -> C6 (1046.5Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(783.99, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, now + 0.12);
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (e) {
    console.debug('WhatsApp chime audio could not be played:', e);
  }
}
