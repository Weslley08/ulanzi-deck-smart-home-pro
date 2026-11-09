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

Não publicar enquanto estas verificações obrigatórias não forem concluídas.
