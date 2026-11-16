# Shelly — configuração local (MVP)

A ação **Shelly** usa a API HTTP RPC documentada para dispositivos Shelly **Gen2+**, sem login em nuvem ou varredura de rede.

## Configuração

1. Conecte o Shelly à mesma rede confiável do computador com Ulanzi Studio.
2. Descubra o IPv4 privado do dispositivo no roteador ou aplicativo Shelly (por exemplo `192.168.1.30`).
3. Adicione a ação **Shelly** na Ulanzi, informe o IPv4 e a senha local do dispositivo caso a autenticação esteja ativada.
4. Clique **Test and connect**. O plugin consulta `Shelly.GetDeviceInfo` e `Shelly.GetStatus`.
5. Selecione uma saída **Switch 0**, **Switch 1** etc. e configure ligar, desligar ou alternar.

## Segurança e limitações

- A senha não vai em URL, parâmetro da tecla ou logs. Quando exigida, o cliente usa **HTTP Digest SHA-256**, conforme documentação Shelly, e pode salvar a configuração com DPAPI CurrentUser.
- RPC via HTTP na LAN **não oferece confidencialidade do tráfego**. Use somente uma rede local confiável e, se aplicável, uma VLAN separada.
- São aceitos apenas endereços IPv4 de redes privadas RFC1918. Sem redirecionamentos, scan de portas ou endpoints arbitrários.
- A entrega inicial cobre somente componentes `switch:<id>`, com `Switch.Set`, `Switch.GetStatus`, `Shelly.GetStatus`; sem Gen1, dimmers, coberturas ou sensores.
- O estado visual é atualizado apenas após confirmação no dispositivo; testes com hardware real continuam pendentes.

Documentação oficial: https://shelly-api-docs.shelly.cloud/gen2/General/RPCChannels/ e https://shelly-api-docs.shelly.cloud/gen2/General/Authentication/
