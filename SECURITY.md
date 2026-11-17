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

No Home Assistant, HTTPS/WSS mantém a validação TLS nativa. HTTP/WS em loopback é permitido; HTTP/WS na LAN requer consentimento explícito por servidor. Apenas endereços RFC1918 e `.local` com DNS privado são admitidos. O IP de destino é verificado e vinculado ao socket em cada REST/WS e reconexão; alterações de destino bloqueiam a comunicação. O token ainda trafega sem criptografia no HTTP LAN: usar apenas rede confiável. A autorização é guardada junto ao token com DPAPI quando o usuário escolhe persistência. Redirecionamentos são recusados. SmartThings e Tuya usam endpoints fixos e HTTPS.

Reportar vulnerabilidades por canal privado.
