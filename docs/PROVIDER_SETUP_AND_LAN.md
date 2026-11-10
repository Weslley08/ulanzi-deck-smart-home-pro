# Conexão inicial e acesso na rede local

## Configuração por ação

No catálogo do Ulanzi Studio selecione **Home Assistant**, **SmartThings** ou **Tuya / Smart Life**.
As ações individuais compartilham uma conexão por provedor no processo do plugin. A ação legada `Device Control` fica para perfis antigos.

1. O painel consulta o status da conexão.
2. O runtime usa uma configuração previamente fornecida pelo ambiente (`HA_URL` e `HA_TOKEN`, `SMARTTHINGS_TOKEN` ou as variáveis `TUYA_*`) se ela estiver completa.
3. Caso não esteja conectada, o painel solicita apenas os campos necessários àquele provedor.
4. **Test and connect** envia credenciais pelo canal transitório `sendToPlugin`; o runtime faz uma chamada real de descoberta para validar o acesso.
5. Somente após validação bem-sucedida aparece **Refresh devices** e a seleção de dispositivo/ação.

**Importante:** nenhuma credencial é salva nos parâmetros do botão ou em configurações globais do Studio. Credenciais digitadas ficam apenas na memória do processo e precisam ser digitadas novamente após fechar o Studio. As variáveis de ambiente existentes continuam como alternativa para desenvolvimento. Não é um armazenamento protegido permanente: não anunciar como solução pronta para produção ou distribuição até haver um cofre nativo e testes de segurança específicos.

Para SmartThings o PAT é **temporário para desenvolvimento**; publicação precisa de autorização de usuário via OAuth oficial. Tuya requer projeto Cloud, UID de conta vinculada e segredo; nenhum token será inferido por varredura local.

## Estratégias de rede (pesquisa, ainda não implementadas)

- Home Assistant: API HTTP(S) e WebSocket na mesma rede, autenticada. A implementação atual exige HTTPS, exceto no loopback; um endereço HTTP de IP privado será rejeitado para evitar transmitir bearer token sem TLS. Estudar opção explícita de HTTP LAN apenas após definição de risco e proteção adequada, sem enfraquecer a segurança padrão.
- SmartThings: API pública de controle está na nuvem; hubs podem executar automações locais com Edge Drivers, o que **não equivale a uma API LAN pública de controle genérico**.
- Tuya / Smart Life: alguns aparelhos possuem controle LAN; a compatibilidade depende do modelo e habilitação do fabricante, e a integração Tuya Cloud não fornece automaticamente controle local.
- Matter: descoberta por DNS-SD/mDNS, mas controle exige comissionamento e certificados; encontrar o IP não basta.
- Zigbee/Z-Wave/Bluetooth: geralmente exigem um hub/controlador/gateway adequado; Wi-Fi não oferece acesso universal a esses dispositivos.
- MQTT: controle local é viável com broker autorizado e tópicos documentados.

### Caminho seguro para descoberta (proposto)

1. Descoberta voluntária por mDNS/DNS-SD para serviços conhecidos; SSDP somente nos tipos suportados.
2. Mostrar dispositivos encontrados e pedir confirmação de acesso/pareamento.
3. Usar exclusivamente APIs oficiais ou protocolos públicos documentados, sem tentativa de senhas/varredura de portas ou protocolos não documentados.
4. Priorizar a conta central ou gateway já conectado como fonte da lista, evitando dispositivos duplicados.
5. Controlar dispositivos locais somente após autenticação e confirmação explícita das capacidades.

Referências:
- https://contributors.home-assistant.io/core/internals/rest-api/
- https://developer.smartthings.com/docs/devices/hub-connected/get-started
- https://support.tuya.com/en/help/_detail/K9tjtiy33x3qf
- https://developers.home.google.com/matter/primer/commissioning
