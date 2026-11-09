# Política de segurança

Não abra issues públicas contendo chaves de API, tokens, endereços internos, logs brutos ou vulnerabilidades exploráveis.

Este é um MVP **não adequado para distribuição a usuários finais**.

## Segredos

Os provedores exigem, neste estágio, credenciais herdadas do ambiente do Ulanzi Studio:

- Home Assistant: `HA_URL`, `HA_TOKEN`
- SmartThings: `SMARTTHINGS_TOKEN` (PAT temporário, curta duração; distribuição deve usar OAuth 2.0)
- Tuya: `TUYA_CLIENT_ID`, `TUYA_CLIENT_SECRET`, `TUYA_USER_ID`, `TUYA_REGION`

Não comite esses valores nem os salve nas configurações dos botões. Antes de uma release, implemente um cofre seguro de credenciais, fluxos de autorização apropriados e exclusão/revogação de acessos.

## Comandos

Ações críticas como desbloquear fechaduras e desativar alarmes não estão implementadas. Os provedores aplicam lista restrita de comandos.

No Home Assistant, HTTP é aceito apenas para loopback, e URLs remotas exigem HTTPS com validação TLS. SmartThings e Tuya usam endpoints fixos e HTTPS.

Reportar vulnerabilidades por canal privado.
