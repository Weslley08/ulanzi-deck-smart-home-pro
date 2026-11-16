# Verificação manual antes da publicação

Este MVP não foi validado no hardware. A aprovação do Gate e de um simulador, se ocorrer, **não comprova compatibilidade com a Ulanzi D200 real**.

- [ ] Zip `dist/` instalado em Ulanzi Studio
- [ ] Ação Device Control aparece e configuração é carregada
- [ ] Ícones aparecem na tela física em todos os estados
- [ ] Um toque dispara somente um comando
- [ ] Home Assistant: conexão, descoberta, autenticação, comando e atualização WebSocket
- [ ] SmartThings: conta autorizada, descoberta, comando, estado e falhas
- [ ] Tuya/Smart Life: associação de conta, autenticação, comando, estado e falhas
- [ ] Inatividade e reconexão não causam loops
- [ ] Credenciais não vazam em logs ou em perfis exportados
- [ ] Testes de desempenho e uso de recursos documentados
- [ ] Limitações de provedor e APIs comerciais revisadas
- [ ] Processo de distribuição e direitos dos componentes revisados

## Home Assistant híbrido — validações obrigatórias

- [ ] HTTPS com certificado válido: REST + WSS funcionam, sem alteração de UX.
- [ ] HTTPS com certificado inválido: acesso bloqueado.
- [ ] HTTP LAN sem autorização: bloqueado sem envio de token.
- [ ] HTTP LAN autorizado para IPv4 RFC1918: REST + WS funcionam.
- [ ] `http://homeassistant.local:8123` resolve IP RFC1918 e fixa o peer; mudança de DNS bloqueia nova conexão.
- [ ] HTTP para domínio público ou IP não RFC1918: bloqueado.
- [ ] Redirecionamento: não seguir nem transmitir Authorization a outro servidor.
- [ ] Reinício com credenciais protegidas: restauração mantém destino aprovado.
- [ ] Alteração de IP, URL ou rede: requer nova autorização.
- [ ] Falhas de rede, timeout, token inválido e reconexão: erros claros, sem vazamento de token.
- [ ] Confirmar na Ulanzi D200 real com HTTPS Tailscale e HTTP LAN, consultando estados e executando ações seguras.
- [ ] Confirmar que SmartThings e Tuya permanecem sem regressão.

Não publicar enquanto estas verificações obrigatórias não forem concluídas.
