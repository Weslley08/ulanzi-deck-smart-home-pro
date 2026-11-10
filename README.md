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

**Planejados / em pesquisa:** MQTT, Matter e Philips Hue. **Xiaomi Home, Google Home e Amazon Alexa são acessíveis exclusivamente pelas entidades, cenas e scripts do Home Assistant**, quando suportados pelo provider HA do plugin. Não são disponibilizados login, API, controle local direto ou conexão própria para esses três ecossistemas; o plugin só executa ações pela API do Home Assistant. Consulte a [matriz de integrações](docs/INTEGRATIONS.md).

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
