# Integrações

| Provedor | Implementação | Validação real | Notas |
|---|---|---|---|
| Home Assistant | MVP REST + WebSocket | Pendente | Ambiente HA_URL / HA_TOKEN |
| SmartThings | MVP REST (discovery, estado, switch) | Pendente | PAT temporário SMARTTHINGS_TOKEN; OAuth de produção pendente |
| Tuya / Smart Life | MVP REST (assinatura, discovery, switch) | Pendente | Projeto Tuya, UID vinculado, região e cotas |
| Xiaomi Home | Pesquisa | Pendente | Preferir integração oficial Xiaomi via HA |
| Amazon Alexa | Pesquisa | Pendente | Smart Home Skill API não permite controle genérico dos dispositivos da conta |
| Google Home | Pesquisa | Pendente | APIs móveis e requisitos próprios |
| MQTT | Planejado | Pendente | Credenciais e broker seguro |
| Matter | Pesquisa | Pendente | Controlador compatível |
| Philips Hue | MVP local CLIP v2 (lâmpadas) | Pendente | Bridge, IP privado, botão físico, pin SHA-256 de certificado e application key protegida |\n| Shelly | MVP local RPC Gen2+ (relés) | Pendente | IP privado, HTTP Digest SHA-256 opcional, controles Switch.Set/GetStatus |
| Tasmota | MVP local HTTP (Relay 1) | Pendente | IP privado, comandos Power1 e sem senha por query string |

## SmartThings

Documentação: https://developer.smartthings.com/docs/service-integrations/query-and-list-devices

As chamadas REST utilizam `https://api.smartthings.com/v1`.
Para desenvolvimento local, um token pessoal de curta duração pode ser fornecido via `SMARTTHINGS_TOKEN`. Para uso distribuído, a plataforma exige OAuth 2.0 e registro de API Access App, com possíveis custos de plano.

O MVP implementa `switch.on/off`, descoberta paginada e leitura de estado. Webhooks/SSE e refresh OAuth ainda não estão implementados. Nenhum status é considerado confirmado apenas pelo POST.

## Tuya / Smart Life

Documentação: https://developer.tuya.com/en/docs/iot/new-singnature?id=Kbw0q34cs2e5g

Requer projeto na Tuya Cloud, conta associada e `TUYA_CLIENT_ID`, `TUYA_CLIENT_SECRET`, `TUYA_USER_ID` e `TUYA_REGION`.

O MVP implementa assinatura HMAC-SHA256 com nonce, aquisição de token, listagem de dispositivos associados ao UID, leitura e comando booleano de funções `switch`, `switch_1` ou `switch_led`. Outras categorias, associações automáticas e eventos em tempo real estão pendentes. O endpoint legado de comandos documentado é `POST /v1.0/devices/{id}/commands`; a Tuya também documenta endpoints iot-03. A compatibilidade do projeto/conta precisa ser confirmada.

A Tuya cobra e restringe uso conforme projetos e planos. Este plugin não garante nenhum plano gratuito.

## Philips Hue e Shelly — MVPs locais

Philips Hue: API CLIP v2 via HTTPS no IP RFC1918 da Bridge, certificado autenticado por impressão digital SHA-256 fornecida pelo usuário, pareamento pelo botão físico (`POST /api`) e comandos limitados a luzes. [Guia de configuração](setup/PHILIPS_HUE.md).

Shelly: comunicação RPC local Gen2+ restrita a saídas `switch:<id>`, com suporte a HTTP Digest SHA-256 quando exigido. O protocolo HTTP não criptografa o tráfego da rede; usar apenas LAN confiável. [Guia de configuração](setup/SHELLY.md).

Ambos reutilizam DPAPI CurrentUser, a API oficial de logs Ulanzi e os controles de cliques repetidos/sondagem de estado. Não houve validação com dispositivos físicos. Sem MQTT nem Matter nesta etapa.

Tasmota: controle HTTP local e deliberadamente limitado a Relay 1 sem autenticação por URL. [Guia Tasmota](setup/TASMOTA.md).
