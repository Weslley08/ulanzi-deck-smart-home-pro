# Diagnóstico de latência, chamadas de API e prevenção de cliques repetidos

## Problema investigado

No SmartThings e na Tuya, o `POST` que executa um comando significa **aceitação pela API**, não que a lâmpada, tomada ou interruptor já mudou de estado. O estado visual só muda depois de uma leitura REST confirmada. A latência percebida pode envolver: envio pelo Ulanzi Studio, rede, serviço cloud, dispositivo físico e atualização na tela.

## Guardrails implementados

- Apenas **um comando em andamento por provedor e ID de dispositivo**, mesmo quando vários botões controlam o mesmo dispositivo. Cliques adicionais não são enfileirados nem executados posteriormente.
- **Cooldown mínimo de 1.200 ms** por dispositivo após iniciar um comando. Não altera o estado visual de forma otimista.
- Se a API retornar **HTTP 429**, o provedor recebe bloqueio por **30 segundos**; não há retry automático de comandos POST.
- Estado cloud confirmado por leituras com atrasos controlados após a aceitação: **450 ms, 900 ms, 1.600 ms e 2.500 ms**. A leitura para ao confirmar. Máximo de quatro GETs de confirmação por comando, sem loop infinito.
- Após erro de autenticação, timeouts de rede ou estado não confirmado, o botão avisa que houve falha em vez de mostrar sucesso falso. Os erros não podem disparar uma tempestade de comandos.

## Logs via SDK oficial Ulanzi V3.1

O Smart Home PRO **não escreve arquivos de log próprios**. Em vez disso, envia eventos
estruturados (JSON curto) através de `host.logMessage(mensagem, nível)`, API do
SDK oficial Ulanzi. O Studio decide onde e como persistir as mensagens.

Níveis usados: `debug` (cliques e comandos suprimidos), `info` (aceitação e confirmação)
e `warn`/`error` (falhas, timeouts e limites da API).

No Windows, procure os logs do Ulanzi Studio sob
`%APPDATA%\\Ulanzi\\UlanziDeck\\logs`, usando o UUID
`com.ulanzi.smarthomepro.ulanziPlugin` para identificar o plugin.
**O caminho e o nome exatos do arquivo pertencem ao Studio e podem variar com a versão**.
Não pressupor arquivo `smart-home.jsonl` nem subpasta própria.

- Cada evento contém tipo, provedor, duração em milissegundos quando disponível e
  hash reduzido do identificador do dispositivo, não seu ID completo.
- Não são registrados tokens, senhas, URLs, payloads da API, cabeçalhos ou nomes dos dispositivos.
- Eventos iguais são limitados a um por janela de 60 segundos, com contagem de repetições
  relatada quando o mesmo evento ocorrer novamente depois da janela.
- O número de chaves de deduplicação é limitado a 128, evitando crescimento indefinido.
- Não há upload automático ou telemetria remota. O Studio gerencia persistência e rotação.
- Logs antigos da implementação JSONL podem permanecer no computador. O plugin não os exclui
  nem move automaticamente.

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
