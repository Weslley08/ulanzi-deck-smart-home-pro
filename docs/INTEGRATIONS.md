# Integrações

| Provedor | Implementação | Validação real | Notas |
|---|---|---|---|
| Home Assistant | MVP REST + WebSocket | Pendente | Ambiente HA_URL / HA_TOKEN |
| SmartThings | MVP REST (discovery, estado, switch) | Pendente | PAT temporário SMARTTHINGS_TOKEN; OAuth de produção pendente |
| Tuya / Smart Life | MVP REST (assinatura, discovery, switch) | Pendente | Projeto Tuya, UID vinculado, região e cotas |
| Xiaomi Home | Exclusivamente via Home Assistant | Dependente das entidades e serviços expostos no HA | Sem API cloud Xiaomi, miIO/MIoT LAN, login ou tokens Xiaomi no plugin |
| Amazon Alexa | Exclusivamente via Home Assistant | Dependente das entidades e serviços expostos no HA | Sem conexão, login, Skill ou SDK da Alexa no plugin |
| Google Home | Exclusivamente via Home Assistant | Dependente das entidades e serviços expostos no HA | Sem conexão, login, SDK ou aplicativo Google no plugin |
| MQTT | Planejado | Pendente | Credenciais e broker seguro |
| Matter | Pesquisa | Pendente | Controlador compatível |
| Philips Hue | Planejado | Pendente | Bridge e chave autorizada |

## Xiaomi Home, Google Home e Amazon Alexa — exclusivamente por Home Assistant

**Decisão de arquitetura:** o Smart Home PRO não cria integrações diretas para Xiaomi Home, Google Home ou Amazon Alexa. O único ponto de entrada e execução aceito pelo plugin para esses três ecossistemas é a **integração Home Assistant já existente**.

- **Descoberta:** listar somente as entidades que o Home Assistant expõe e que o provider HA do plugin suporta. Não consultar contas Xiaomi/Google/Amazon nem tentar importar automaticamente a lista de dispositivos de suas aplicações.
- **Comandos:** enviar apenas requisições autenticadas à API oficial do **Home Assistant** (serviços, scripts ou automações configurados e autorizados nele). Se o HA encaminhar ações aos provedores, isso é responsabilidade da configuração do HA, não uma conexão do plugin.
- **Estado:** mostrar somente os estados recebidos/confirmados pelo Home Assistant. Nunca assumir que uma ação enviada por uma automação alterou o dispositivo físico.
- **Credenciais:** o plugin não solicita, armazena nem utiliza credenciais ou tokens Xiaomi/Google/Amazon; mantém apenas a autorização HA já prevista.
- **Sem componentes externos:** não desenvolver cliente direto Xiaomi Cloud/MIoT/miIO, Google Home APIs, aplicativo Android/iOS, ponte Windows–celular, Alexa Skill, Alexa Routines Custom Triggers, navegação automatizada nem endpoints privados para controlar dispositivos desses ecossistemas.
- **Interface:** não adicionar opções "Conectar Xiaomi", "Conectar Alexa" ou "Conectar Google Home"; selecionar as entidades e ações disponíveis pelo provedor Home Assistant.
- **Limite de compatibilidade:** dispositivos, serviços e automações indisponíveis no HA continuam indisponíveis no plugin. A presença de Xiaomi Home, Google Home ou Alexa na residência não implica acesso automático a todos os seus dispositivos.

**Backlog:** nenhuma integração direta Xiaomi/Google/Alexa. Eventuais melhorias devem ocorrer na experiência do provider Home Assistant (descoberta de entidades suportadas, seleção de scripts/cenas e feedback de estado), sem executar comandos em canais paralelos ao HA.

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
