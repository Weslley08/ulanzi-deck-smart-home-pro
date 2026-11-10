# Pipeline central do Ulanzi Smart Home PRO

Fonte oficial: https://github.com/Weslley08/ulanzi-plugin-pipeline

O repositório usa `.github/workflows/gate.yml` e `delivery.yml`, apontando para os reusable workflows `@v1`. O antigo `ci.yml` independente foi removido.

O fluxo é `feature/*` → `develop` → `release/vX.Y.Z` → `main`.
A Delivery abre automaticamente PRs de trabalho somente com a GitHub App configurada no repositório (`APP_CLIENT_ID` e `APP_PRIVATE_KEY`). Sem os secrets ela não pode abrir PRs.

**Pré-requisitos bloqueantes do Smart Home PRO ainda pendentes:** scripts `setup`, `typecheck`, `test:coverage`, `package`, `verify:package`, `check:sdk`, `check:secrets`, `measure`, `bump`; lockfiles de ambos os níveis; empacotamento verificável e imagens de manifesto; revisão de licenças. Gate deve falhar até que sejam satisfeitos. Não criar no-op scripts para falsificar êxito.

**Para o mantenedor:**

1. Instalar a GitHub App de automação no repositório e configurar os secrets `APP_CLIENT_ID` e `APP_PRIVATE_KEY` (não reutilizar o segredo da conta de usuário).
2. Não usar `PUBLISHING_ENABLED`: a pipeline atual não recebe esse input. Bloquear merge de `release/*` na `main` até a verificação no dispositivo físico e a aprovação do mantenedor.
3. Implementar scripts faltantes e garantir Gate e CodeQL reportando de fato.
4. Executar `node scripts/setup-repo.mjs Weslley08/ulanzi-deck-smart-home-pro --dry-run` a partir do repositório central.
5. Aplicar proteções somente após checagens reais; não declarar proteção como aplicada antes disso.

A publicação também depende de revisão do `docs/VERIFY.md` no equipamento real.
