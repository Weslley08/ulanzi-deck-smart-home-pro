# Smart Home PRO

Plugin de automação residencial para Ulanzi D200, desenvolvido a partir do padrão Clima PRO.

**Status: MVP em desenvolvimento. Não é um release validado em hardware.**

## O que já existe

- Adaptador Home Assistant: REST para descobrir entidades e executar comandos permitidos.
- WebSocket para receber eventos de mudança de estado.
- Property Inspector para selecionar dispositivo e ação.
- Ícones de ligado, desligado e offline.
- Testes iniciais, isolamento de provedores e pipeline de qualidade.

O MVP suporta luzes, tomadas, ventiladores, cortinas, cenas, scripts e input booleans. Comandos críticos (fechaduras, alarmes e portões) ficam fora da primeira versão.

**Não estão implementados:** SmartThings, Tuya/Smart Life, Xiaomi direto, Alexa, Google Home, MQTT, Matter ou Hue. Consulte [a matriz de integrações](docs/INTEGRATIONS.md).

## Desenvolvimento

```powershell
npm install
npm run check
npm test
npm run build:plugin
```

Para conectar o Home Assistant, configure `HA_URL` e `HA_TOKEN` no ambiente herdado pelo processo do Ulanzi Studio. Consulte [instruções](docs/DEVELOPMENT.md) e [segurança](SECURITY.md). O projeto não foi testado na Ulanzi real nesta branch.

## Repositório e procedência

- Plugin ID: `com.ulanzi.smarthomepro.ulanziPlugin`
- Inicializado pelo [Repo Factory](https://github.com/Weslley08/repo-factory-starter) usando template `ulanzi-plugin`.
- Procedência preservada em `.repo-factory.json` e na tag `template-ulanzi-plugin`.
- Referência arquitetural: [Clima PRO](https://github.com/Weslley08/ulanzi-deck-clima-pro).
- SDK Ulanzi fornecido conforme o projeto oficial. Verificar licença, atribuições e compatibilidade antes de distribuir.

Nenhuma release automática está habilitada.
