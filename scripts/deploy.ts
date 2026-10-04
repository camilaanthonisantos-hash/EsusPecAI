import { execSync } from "child_process";

function run(cmd: string, ignoreError = false): string {
  try {
    return execSync(cmd, { stdio: "pipe", encoding: "utf-8" }).trim();
  } catch (err: any) {
    if (!ignoreError) {
      console.error(`❌ Erro ao executar: ${cmd}`);
      if (err.stdout) console.log(err.stdout.toString());
      if (err.stderr) console.error(err.stderr.toString());
      throw err;
    }
    return "";
  }
}

async function main() {
  console.log("\n============================================================");
  console.log("🚀 SCRIPT AUTOMATIZADO DE DEPLOY & SINCRONIZAÇÃO TOTAL");
  console.log("============================================================\n");

  // 1. Salvar qualquer alteração local pendente
  console.log("📦 1/5. Salvando alterações locais...");
  run("git add -A", true);
  try {
    run('git commit -m "chore: salvar alteracoes locais antes do sync"', true);
  } catch {}

  // 2. Puxar alterações do AI Studio / GitHub
  console.log("📥 2/5. Puxando novidades do AI Studio / GitHub...");
  try {
    run("git pull origin main --no-rebase -s recursive -X ours", true);
  } catch {
    console.log("   Tentando pull padrão...");
    run("git pull origin main", true);
  }

  // 3. Compilar a versão de produção (Frontend + Backend)
  console.log("⚙️  3/5. Compilando o projeto (Vite + esbuild)...");
  run("npm run build");

  // 4. Salvar a compilação gerada
  console.log("📦 4/5. Empacotando arquivos de produção (dist)...");
  run("git add -A");
  try {
    run('git commit -m "deploy: versao de producao compilada [auto-sync]"', true);
  } catch {
    console.log("   Nenhuma alteração extra para comitar.");
  }

  // 5. Enviar tudo para o GitHub
  console.log("🚀 5/5. Enviando para o GitHub para atualizar o Portainer...");
  run("git push origin main");

  console.log("\n============================================================");
  console.log("✅ DEPLOY CONCLUÍDO COM SUCESSO!");
  console.log("O GitHub notificou o Portainer via Webhook.");
  console.log("Sua aplicação em https://peccapsai.mentoriajrs.com já está atualizada!");
  console.log("============================================================\n");
}

main().catch((err) => {
  console.error("\n❌ Falha no deploy automático:", err.message);
  process.exit(1);
});
