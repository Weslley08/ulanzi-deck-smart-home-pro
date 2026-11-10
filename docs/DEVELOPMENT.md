# Desenvolvimento

Node.js 20.12.2+.

```powershell
npm install
npm run check
npm test
npm run build:plugin
```

## Fluxo atual de configuração (branch feature/provider-first-setup)

No catálogo de ações do Studio há três opções independentes:
**Home Assistant**, **SmartThings** e **Tuya / Smart Life**.
A ação antiga **Device Control** foi removida do catálogo de novas ações. O runtime ainda reconhece seu identificador para reduzir impactos em perfis antigos; para configurações novas, utilize uma das três ações específicas.

Ao abrir o painel, o plugin verifica se há uma sessão conectada e se existem variáveis de ambiente válidas para o provedor. Se a autenticação já foi validada, mostra a lista de dispositivos; se há dados faltando, mostra apenas os campos ausentes. Também é possível preencher credenciais diretamente no painel, sem definir variáveis no Windows. A verificação efetua descoberta real antes de marcar **Connected**.

**Persistência:** dispositivo e ação continuam salvos nos parâmetros do botão, **sem token**. No Windows, ao marcar **Lembrar credenciais neste Windows**, o plugin armazena os dados com **DPAPI CurrentUser** em `%LOCALAPPDATA%\\Ulanzi\\SmartHomePRO\\credentials\\<provider>.dpapi`. O Windows protege o conteúdo por conta de usuário, e o plugin tenta reconectar na próxima inicialização após validar novamente o acesso à API. Desmarcar usa sessão temporária; **Desconectar** remove a conexão e o arquivo salvo. Variáveis de ambiente configuradas pelo próprio usuário continuam independentes desse cofre. Não exportar arquivos DPAPI entre máquinas e não exibir tokens no Inspector. SmartThings PAT expira conforme política da Samsung; DPAPI não renova tokens nem substitui OAuth 2.0 para produção.

A descoberta LAN automática é apenas proposta técnica: veja [PROVIDER_SETUP_AND_LAN.md](PROVIDER_SETUP_AND_LAN.md). O Home Assistant aceita HTTPS na rede, mas HTTP no IP privado não é aceito pela implementação atual por causa da exposição do token em texto claro.

## Configuração temporária

Em um ambiente local controlado, disponibilize ao processo do Ulanzi Studio somente as credenciais dos provedores usados. Não comite valores nem inclua segredos em perfis exportados.

| Provedor | Ambiente |
|---|---|
| Home Assistant | `HA_URL`, `HA_TOKEN` |
| SmartThings | `SMARTTHINGS_TOKEN` (PAT curta duração para desenvolvimento) |
| Tuya | `TUYA_CLIENT_ID`, `TUYA_CLIENT_SECRET`, `TUYA_USER_ID`, `TUYA_REGION` (`us`, `eu`, `cn`, `in`) |

Instale a pasta gerada `com.ulanzi.smarthomepro.ulanziPlugin` em `%APPDATA%\Ulanzi\UlanziDeck\Plugins\` e reinicie o Studio. O ambiente do Studio deve herdar as variáveis; variáveis definidas só no terminal de build não bastam.

**Essas variáveis são uma solução de desenvolvimento.** A persistência DPAPI protege segredos localmente no Windows, mas SmartThings para produção ainda exige OAuth 2.0, e a solução precisa de revisão e teste no dispositivo real antes de publicar uma release.

## Funcionalidades

Selecione o provedor, atualize a lista, escolha o dispositivo e a ação.

- HA: controle de domínios autorizados; WebSocket entrega mudanças de estado.
- SmartThings: switches compatíveis; leitura de estado por REST após comando.
- Tuya: funções booleanas switch reconhecidas; leitura de estado por REST após comando.

O botão não assume sucesso pelo simples recebimento HTTP do comando.

## Limitações

- Nenhuma das integrações cloud foi testada com conta real.
- A integração SmartThings para usuário final precisa de OAuth 2.0 e infraestrutura autorizada.
- A integração Tuya exige projeto Cloud e vinculação de conta.
- Não há push cloud, cenas entre provedores ou deduplicação de dispositivos neste MVP.
- Os ícones, o empacotamento e a instalação real ainda precisam de validação na Ulanzi D200.
- Não foi publicada release.

## Ajuda integrada para cada provedor

A ação Home Assistant, SmartThings ou Tuya / Smart Life mostra dois botões no painel de propriedades:

- **Como configurar esta integração:** abre um guia HTML local, dentro do pacote instalado, com os passos e observações de segurança.
- **Abrir site oficial:** abre o portal/documentação de autorização na plataforma do provedor.

Os arquivos estão em `com.ulanzi.smarthomepro.ulanziPlugin/property-inspector/help/` e acompanham o ZIP de distribuição. As URLs são fixas e revisadas, não derivadas de credenciais ou dados do dispositivo. O guia pode ser consultado antes da autenticação, mesmo sem dispositivos detectados.

O SmartThings PAT serve para desenvolvimento e tem validade de 24 horas. Tuya requer projeto Cloud, vínculo da conta por QR Code e UID. Home Assistant requer token de longa duração e, para um host não-loopback, URL HTTPS. Nenhuma senha, token ou Client Secret deve ser informado nos links de ajuda.
