# Conectar Home Assistant

Guia oficial de configuração do **Smart Home PRO para Ulanzi D200**.

## Passo a passo

1. Abra a interface web do seu Home Assistant e faça login com uma conta que tenha acesso aos dispositivos.

2. Abra seu perfil de usuário e entre na seção Segurança (Security).

3. Em Long-lived access tokens, selecione Criar token e atribua um nome como Ulanzi Smart Home PRO.

4. Copie o token no momento da criação e mantenha-o em segredo; não compartilhe nem inclua em perfis exportados.

5. Identifique a URL base do Home Assistant. A versão atual do plugin exige HTTPS para hosts remotos ou HTTP somente em localhost/127.0.0.1.

6. No Ulanzi Studio, abra a ação Home Assistant, preencha URL e token (se não tiverem sido detectados), clique Test and connect; depois selecione o dispositivo e a ação.

## Sites e documentação oficial

- [Documentação oficial do provedor](https://www.home-assistant.io/docs/authentication/)

## Problemas comuns e segurança

- Se o Home Assistant funcionar apenas em http://192.168.x.x:8123, a versão atual não aceita essa conexão em texto claro. Configure HTTPS confiável ou use acesso local seguro.
- Se a lista estiver vazia, confira permissões da conta, URL, validade do token e acesso à rede.
- Nunca compartilhe tokens, Client Secrets ou credenciais por mensagens. A versão atual mantém credenciais digitadas apenas durante a sessão; elas não são armazenadas nos perfis do Studio.

> Nunca cole credenciais em issues, PRs, perfis exportados nem URLs de ajuda. Os tokens inseridos no painel atual são apenas de sessão.

Este guia é mantido no repositório e pode ser corrigido sem distribuir outra versão do plugin.
