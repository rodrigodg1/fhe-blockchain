#!/usr/bin/env bash
# Cria um repositorio privado. Nao altera repositorios existentes.
# Nao executa os exemplos nem implanta contratos.
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="rodrigodg1/fhe-healthcare-roadmap"
for cmd in git gh python3; do
  command -v "$cmd" >/dev/null || { echo "Instale $cmd." >&2; exit 1; }
done
gh auth status --hostname github.com >/dev/null
LOGIN="$(gh api user --jq .login)"
[[ "$LOGIN" == "rodrigodg1" ]] || { echo "Use a conta rodrigodg1." >&2; exit 1; }
if gh repo view "$REPO" --json name >/dev/null 2>&1; then
  echo "$REPO ja existe; nada foi alterado." >&2; exit 1
fi
[[ ! -e .git ]] || { echo "Use uma pasta nova, sem .git." >&2; exit 1; }
python3 scripts/verificar-pacote.py
git init -b main
if ! git config user.name >/dev/null; then
  git config --local user.name "$(gh api user --jq '.name // .login')"
fi
if ! git config user.email >/dev/null; then
  ID="$(gh api user --jq .id)"
  git config --local user.email "${ID}+${LOGIN}@users.noreply.github.com"
fi
while IFS= read -r entrada; do
  caminho="${entrada#*  }"
  git add -- "$caminho"
done < SHA256SUMS.txt
git add -- SHA256SUMS.txt
git diff --cached --stat
git commit -m "Adiciona roadmap de FHE em saude"
gh auth setup-git --hostname github.com
gh repo create "$REPO" --private --source=. --remote=origin --push   --description "FHE em saude com TFHE-rs e FHEVM"
gh repo view "$REPO" --json url,isPrivate --jq '"Repositorio: " + .url + " | privado: " + (.isPrivate|tostring)'
