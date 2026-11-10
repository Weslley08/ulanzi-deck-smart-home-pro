# Diagnóstico de latência, chamadas de API e prevenção de cliques repetidos

## Problema investigado

No SmartThings e na Tuya, o `POST` que executa um comando significa **aceitação pela API**, não que a lâmpada, tomada ou interruptor já mudou de estado. O estado visual só muda depois de uma leitura REST confirmada. A latência percebida pode envolver: envio pelo Ulanzi Studio, rede, serviço cloud, dispositivo físico e atualização na tela.

## Guardrails implementados

- Apenas **um comando em andamento por provedor e ID de dispositivo**, mesmo quando vários botões controlam o mesmo dispositivo. Cliques adicionais não são enfileirados nem executados posteriormente.
- **Cooldown mínimo de 1.200 ms** por dispositivo após iniciar um comando. Não altera o estado visual de forma otimista.
- Se a API retornar **HTTP 429**, o provedor recebe bloqueio por **30 segundos**; não há retry automático de comandos POST.
- Estado cloud confirmado por leituras com atrasos controlados após a aceitação: **450 ms, 900 ms, 1.600 ms e 2.500 ms**. A leitura para ao confirmar. Máximo de quatro GETs de confirmação por comando, sem loop infinito.
- Após erro de autenticação, timeouts de rede ou estado não confirmado, o botão avisa que houve falha em vez de mostrar sucesso falso. Os erros não podem disparar uma tempestade de comandos.

## Logs locais

No Windows, os logs JSONL ficam em:

`%LOCALAPPDATA%\Ulanzi\SmartHomePRO\logs\smart-home.jsonl`

- Cada linha inclui timestamp, evento, provedor e duração (milissegundos); um hash curto do identificador de dispositivo permite correlacionar ações sem expor o ID original.
- Exemplos de eventos: `button_pressed`, `command_started`, `command_accepted`, `command_suppressed`, `state_confirmed`, `state_confirmation_timeout`, `provider_rate_limited`.
- Sem tokens, senhas, URLs da conta, payloads, cabeçalhos ou nomes de dispositivos.
- Rotação local quando o arquivo ultrapassa **2 MiB**; o arquivo anterior recebe sufixo `.previous`.
- Logs são para diagnóstico, não para upload automático, métricas remotas nem telemetria sem consentimento.

### Como avaliar a demora

1. Pressione uma vez o botão de um switch SmartThings.
2. Consulte as linhas com o mesmo `deviceHash`.
3. `command_accepted.elapsedMs` mede a ida e volta à API (mais processamento local da chamada).
4. `state_confirmed.elapsedMs` mede o período de confirmação REST desde a aceitação, **não** o tempo físico exato do dispositivo.
5. Muitos `command_suppressed` indicam cliques enquanto uma operação anterior ainda estava pendente; isso é proposital.
6. `provider_rate_limited` indica limitação do serviço; espere o fim do bloqueio antes de tentar novamente.

## Limites e testes pendentes

- O protocolo do SmartThings não confirma instantaneamente a mudança física; não afirmar melhoria de tempo de resposta sem medir com uma conta real e a Ulanzi D200.
- Os guardrails são implementados no runtime comum e beneficiam SmartThings e Tuya. O Home Assistant mantém seus eventos WebSocket para atualização.
- Não é mecanismo de offline command queue: não existe replay automático, por segurança.
- O gate automatizado verifica concorrência, limite de sondagens, erros e 429; teste de experiência de uso real ainda é obrigatório.
