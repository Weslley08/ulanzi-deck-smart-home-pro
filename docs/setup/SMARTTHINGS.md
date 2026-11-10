# Conectar SmartThings

Guia oficial de configuração do **Smart Home PRO para Ulanzi D200**.

## Passo a passo

1. Entre em account.smartthings.com/tokens com a mesma conta Samsung usada no aplicativo SmartThings.

2. Clique Generate new token e dê um nome como Ulanzi Smart Home PRO.

3. Em Authorized Scopes, permita leitura de dispositivos (r:devices:*) e execução de comandos (x:devices:*). Não é necessário conceder exclusão ou edição de cadastro.

4. Clique Generate Token e copie o valor imediatamente; ele não poderá ser exibido novamente.

5. No Ulanzi Studio, arraste a ação SmartThings para um botão, cole o token no campo indicado e clique Test and connect.

6. Após a confirmação, clique Refresh devices e selecione um interruptor/dispositivo compatível e a ação desejada.

## Sites e documentação oficial

- [Documentação oficial do provedor](https://developer.smartthings.com/docs/getting-started/authorization-and-permissions)
- [Abrir página de configuração / tokens](https://account.smartthings.com/tokens)

## Problemas comuns e segurança

- Personal Access Tokens novos geralmente expiram 24 horas; o fluxo atual é somente para testes. OAuth 2.0 ainda não foi implementado no plugin.
- Somente dispositivos com capacidades implementadas são listados; outros podem não aparecer mesmo com permissões válidas.
- Nunca compartilhe tokens, Client Secrets ou credenciais por mensagens. A versão atual mantém credenciais digitadas apenas durante a sessão; elas não são armazenadas nos perfis do Studio.

> Nunca cole credenciais em issues, PRs, perfis exportados nem URLs de ajuda. Os tokens inseridos no painel atual são apenas de sessão.

Este guia é mantido no repositório e pode ser corrigido sem distribuir outra versão do plugin.
