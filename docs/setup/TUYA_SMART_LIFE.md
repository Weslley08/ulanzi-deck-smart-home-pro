# Conectar Tuya / Smart Life

Guia oficial de configuração do **Smart Home PRO para Ulanzi D200**.

## Passo a passo

1. Entre na Tuya Developer Platform usando a conta de desenvolvedor e crie um Cloud Project com método Smart Home.

2. Selecione o Data Center que corresponde à região de sua conta Smart Life/Tuya. Veja disponibilidade e custo dos serviços antes de ativá-los.

3. No projeto, abra Authorization Key e copie Client ID (Access ID) e Client Secret (Access Secret).

4. Em Devices → Link App Account → Add App Account, escolha a autorização da conta Tuya e exiba o QR Code.

5. Abra o app Smart Life ou Tuya Smart no celular, escaneie o QR Code e confirme a vinculação dos dispositivos.

6. Após vincular, encontre o UID da conta em Link App Account. Confira os dispositivos na aba All Devices.

7. No Studio, abra Tuya / Smart Life e informe Client ID, Client Secret, Linked account UID e Cloud region; teste a conexão e depois escolha o dispositivo.

## Sites e documentação oficial

- [Documentação oficial do provedor](https://developer.tuya.com/en/docs/developer/apply-cloud-api-key?id=Kff30z8sv62ah)
- [Abrir página de configuração / tokens](https://platform.tuya.com/)

## Problemas comuns e segurança

- A API Cloud só retorna dispositivos autorizados no projeto e na região escolhida. Nem todos os dispositivos Tuya têm uma função switch compatível.
- A região escolhida deve corresponder ao projeto Cloud; o suporte atual do plugin inclui us, eu, cn e in.
- Nunca compartilhe tokens, Client Secrets ou credenciais por mensagens. A versão atual mantém credenciais digitadas apenas durante a sessão; elas não são armazenadas nos perfis do Studio.

> Nunca cole credenciais em issues, PRs, perfis exportados nem URLs de ajuda. Os tokens inseridos no painel atual são apenas de sessão.

Este guia é mantido no repositório e pode ser corrigido sem distribuir outra versão do plugin.
