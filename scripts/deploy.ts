import { execSync } from "child_process";
import fs from "fs";

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

function extractToken(): string | undefined {
  // Check env vars first
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN.trim();
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN.trim();
  if (process.env.TOKEN) return process.env.TOKEN.trim();

  // Check CLI arguments
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (!arg) continue;
    // Check --token=XXX or -t=XXX or token=XXX
    if (arg.includes("=")) {
      const parts = arg.split("=");
      if (parts[1] && parts[1].trim()) return parts[1].trim().replace(/^["']|["']$/g, "");
    }
    // Check direct token string or positional argument
    const cleanArg = arg.trim().replace(/^["']|["']$/g, "");
    if (cleanArg.startsWith("ghp_") || cleanArg.startsWith("github_pat_") || cleanArg.length >= 20) {
      return cleanArg;
    }
  }
  return undefined;
}

async function main() {
  console.log("\n============================================================");
  console.log("🚀 SCRIPT AUTOMATIZADO DE DEPLOY & SINCRONIZAÇÃO GITHUB");
  console.log("============================================================\n");

  const repoPath = "github.com/camilaanthonisantos-hash/EsusPecAI.git";
  const token = extractToken();

  // 0. Garantir repositório Git local
  if (!fs.existsSync(".git")) {
    console.log("🔧 0/5. Inicializando repositório Git local...");
    run("git init");
    run("git branch -M main");
  }

  // Garantir usuário Git configurado
  run('git config user.name "e-SUS PEC AI"');
  run('git config user.email "deploy@peccapsai.mentoriajrs.com"');

  // Configurar remote URL com ou sem token
  const remoteUrl = token
    ? `https://${token}@${repoPath}`
    : `https://${repoPath}`;

  // Atualizar a URL do remote origin de forma segura
  run("git remote remove origin", true);
  run(`git remote add origin "${remoteUrl}"`, true);

  // 1. Sincronizar histórico do remoto
  console.log("📥 1/4. Verificando repositório remoto do GitHub...");
  try {
    run("git fetch origin main", true);
  } catch {
    console.log("   (Conexão inicial com repositório remoto estabelecida)");
  }

  // 2. Compilar versão de produção antes de comitar
  console.log("⚙️  2/4. Compilando o projeto (Vite + esbuild)...");
  run("npm run build");

  // Validar arquivos essenciais do dist
  if (!fs.existsSync("dist/server.cjs") || !fs.existsSync("dist/index.html")) {
    throw new Error("Falha crítica: dist/server.cjs ou dist/index.html não foram gerados!");
  }

  // 3. Empacotar código e arquivos compilados juntos
  console.log("📦 3/4. Empacotando código e dist de produção...");
  run("git add -A");
  try {
    const timestamp = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    run(`git commit -m "deploy: versão de produção gerada [${timestamp}]"`, true);
  } catch {
    console.log("   Nenhuma alteração extra para comitar.");
  }

  // 4. Push para o GitHub
  console.log("🚀 4/4. Enviando commits para o GitHub...");
  try {
    run("git push -f origin main");
    console.log("\n============================================================");
    console.log("✅ DEPLOY CONCLUÍDO COM SUCESSO!");
    console.log("O GitHub foi atualizado e acionará o Portainer!");
    console.log("Aplicação: https://peccapsai.mentoriajrs.com");
    console.log("============================================================\n");
  } catch (err: any) {
    console.error("\n============================================================");
    console.error("❌ ERRO AO FAZER PUSH PARA O GITHUB!");
    console.error("============================================================");
    if (!token) {
      console.error("\nO GitHub exige um Personal Access Token (PAT) para autorizar o push.");
      console.error("\n💡 COMO EXECUTAR CORRETAMENTE (Escolha uma opção):");
      console.error("\nOpção 1 (Direto no comando):");
      console.error("   npm run deploy ghp_SEU_TOKEN_AQUI\n");
      console.error("Opção 2 (Via flag):");
      console.error("   npm run deploy -- --token=ghp_SEU_TOKEN_AQUI\n");
      console.error("Opção 3 (Via variável de ambiente):");
      console.error("   GITHUB_TOKEN=ghp_SEU_TOKEN_AQUI npm run deploy\n");
    } else {
      console.error("\nO token informado foi recusado pelo GitHub (token inválido ou expirado).");
      console.error("Verifique se o token possui a permissão 'repo' selecionada no GitHub.");
    }
    console.error("============================================================\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n❌ Falha no deploy:", err.message);
  process.exit(1);
});
