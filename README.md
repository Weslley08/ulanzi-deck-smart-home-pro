# Smart Home PRO

Plugin de automação residencial para Ulanzi D200, seguindo os padrões do [Clima PRO](https://github.com/Weslley08/ulanzi-deck-clima-pro).

**Status: MVP de desenvolvimento. Ainda não validado em hardware nem com contas reais. Não é uma release.**

## Integrações disponíveis no código

| Provedor | Funções implementadas | Validação |
|---|---|---|
| Home Assistant | Descoberta, comandos REST, eventos WebSocket | Mocks; dispositivo real pendente |
| Samsung SmartThings | Descoberta REST, leitura e switch on/off | Mocks; OAuth de produção pendente |
| Tuya / Smart Life | Token, assinatura HMAC, descoberta, switch on/off | Mocks; vinculação de conta pendente |

Os três provedores são selecionáveis no Property Inspector. O botão representa o estado recebido ou consultado, sem presumir sucesso ao enviar o comando.

**Novos provedores locais no PR #20 (MVP não validado em hardware):** Philips Hue (Bridge CLIP v2), Shelly Gen2+ (RPC) e Tasmota (HTTP, Relay 1). Consulte [Hue](docs/setup/PHILIPS_HUE.md), [Shelly](docs/setup/SHELLY.md) e [Tasmota](docs/setup/TASMOTA.md) para requisitos e limitações.

**Integrações ainda planejadas:** MQTT e Matter. **Xiaomi Home, Amazon Alexa e Google Home são acessíveis apenas por entidades/serviços do Home Assistant**, sem API, login ou comunicação direta do plugin (decisão documentada no PR #19). Veja a [matriz de integrações](docs/INTEGRATIONS.md).

## Desenvolvimento

```powershell
npm install
npm run check
npm test
npm run build:plugin
```

Consulte [configuração de provedores](docs/DEVELOPMENT.md) e [segurança](SECURITY.md). Os segredos são fornecidos por variáveis de ambiente no MVP; releases distribuídas exigem gerenciador seguro de contas e autenticação oficial.

## Origem

- Plugin ID: `com.ulanzi.smarthomepro.ulanziPlugin`.
- Inicializado pelo [Repo Factory](https://github.com/Weslley08/repo-factory-starter), template `ulanzi-plugin`.
- Procedência preservada em `.repo-factory.json` e tag `template-ulanzi-plugin`.
- SDK Ulanzi baseado na versão utilizada pelo Clima PRO; direitos e avisos de componentes precisam ser verificados antes da distribuição.

Nenhuma release automática foi habilitada.
