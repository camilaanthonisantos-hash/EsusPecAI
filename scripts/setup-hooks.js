import fs from "fs";
import path from "path";

const gitHooksDir = path.join(process.cwd(), ".git", "hooks");

if (fs.existsSync(gitHooksDir)) {
  const hookSource = path.join(process.cwd(), "scripts", "git-hooks", "pre-commit");
  const hookTarget = path.join(gitHooksDir, "pre-commit");

  if (fs.existsSync(hookSource)) {
    try {
      fs.copyFileSync(hookSource, hookTarget);
      try {
        fs.chmodSync(hookTarget, "755");
      } catch {}
      console.log("✅ [Git Hook] Hook de pre-commit instalado com sucesso em .git/hooks/pre-commit");
    } catch (err) {
      console.warn("⚠️ [Git Hook] Não foi possível copiar hook:", err);
    }
  }
}
