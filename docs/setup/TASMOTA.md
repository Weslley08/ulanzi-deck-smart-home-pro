# Tasmota — controle HTTP local (MVP)

Este provedor utiliza exclusivamente os comandos HTTP documentados do firmware Tasmota e **não requer broker MQTT**.

## Configuração

1. Conecte o dispositivo Tasmota e o computador com Ulanzi Studio à mesma LAN confiável.
2. No roteador, obtenha o IPv4 privado do equipamento, como `192.168.1.40`.
3. Confirme que o servidor HTTP Tasmota está ativado **sem senha**, pois a interface HTTP comum da Tasmota utiliza senha em parâmetros de URL. O plugin deliberadamente **não** envia credenciais por query string.
4. Adicione a ação **Tasmota**, informe o IP e escolha **Test and connect**.
5. Selecione **Relay 1** e configure alternar, ligar ou desligar.

## Segurança / escopo

- Somente IPv4 RFC1918; nada de scans ou acesso remoto à nuvem.
- Usa `Power1`, `Power1 ON` e `Power1 OFF` via endpoint documentado `/cm?cmnd=`.
- Sem comandos arbitrários, sem envio de senha por URL e sem automação de firmware.
- O estado visual é confirmado por uma consulta adicional e nunca pelo simples envio do comando.
- Equipamentos protegidos por senha HTTP devem ser conectados através do **Home Assistant** ou de uma integração MQTT futura com TLS e autenticação; não desative proteção só para usar o plugin em redes não confiáveis.
- Não há controle de múltiplos relés, sensores, MQTT, TLS HTTP ou descoberta mDNS neste MVP. Testes em hardware real pendentes.

Documentação oficial: https://tasmota.github.io/docs/Commands/
