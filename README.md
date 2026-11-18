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

## Filtragem de entidades Home Assistant por etiqueta

O Smart Home PRO exibe **somente entidades com a etiqueta de entidade `ulanzi`** no Home Assistant, além de respeitar os domínios de controle suportados (`light`, `switch`, `fan`, `cover`, `scene`, `script` e `input_boolean`).

1. No Home Assistant, abra **Configurações → Dispositivos e serviços → Entidades**.
2. Edite as entidades desejadas e atribua a etiqueta **ulanzi** (ID interno `ulanzi`). Atribua a etiqueta à entidade, não apenas ao dispositivo ou à área.
3. No Ulanzi Studio, abra a configuração do botão e clique em **Refresh devices**. O seletor deve mostrar somente as entidades etiquetadas.
4. Ao adicionar ou remover a etiqueta, o plugin tenta atualizar a lista automaticamente pelos eventos de registro do Home Assistant. O botão **Refresh devices** permite uma nova consulta manual.

A consulta usa o WebSocket autenticado `config/entity_registry/list_for_display` e a lista `lb` de cada entidade. Quando a consulta falha, o plugin não expõe entidades; a ação de cada botão também revalida a etiqueta imediatamente antes de executar o comando. Se uma entidade perder a etiqueta, deixa de aparecer e seu botão configurado não poderá executar comandos pelo plugin.

**Importante:** esta é uma lista de exposição **do plugin**, não uma restrição de permissões do token Home Assistant. O token continua com os acessos da conta que o emitiu. SmartThings, Tuya e a sincronização Alexa são independentes deste filtro. Entidades fora dos domínios listados permanecem indisponíveis mesmo se etiquetadas.


**Planejados:** Xiaomi Home, Alexa, Google Home, MQTT, Matter, Philips Hue. Alguns ecossistemas têm restrições de APIs; consulte [matriz de integrações](docs/INTEGRATIONS.md).

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
