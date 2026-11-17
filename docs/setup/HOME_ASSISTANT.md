# Conectar Home Assistant — HTTPS seguro ou HTTP LAN autorizado

O Smart Home PRO utiliza somente as APIs **REST** (`/api/states`, `/api/services/...`) e
**WebSocket** (`/api/websocket`) oficiais do Home Assistant, por uma única política
de segurança. Não há conexão direta com Xiaomi, Google ou Alexa.

## Passo a passo

1. Entre no Home Assistant com a conta que tem acesso às entidades.
2. Abra o perfil do usuário → **Segurança** → **Long-lived access tokens**.
3. Crie um token para o plugin, copie-o uma vez e não o compartilhe.
4. No Ulanzi Studio, adicione a ação **Home Assistant** e informe a URL e o token.
5. Em **Modo de conexão**, escolha uma das opções:
   - **HTTPS seguro (padrão):** use `https://homeassistant.tail6132fe.ts.net` ou qualquer endereço HTTPS com certificado TLS válido. REST usa HTTPS; eventos usam WSS. Não precisa marcar autorização insegura.
   - **HTTP na rede local (avançado):** use `http://192.168.1.100:8123`, `http://10.0.0.20:8123` ou `http://homeassistant.local:8123`. Leia o aviso e marque a confirmação de risco **para esse servidor**. REST usa HTTP; WebSocket usa WS.
   - **Loopback:** `http://localhost:8123` e `http://127.0.0.1:8123` continuam possíveis sem consentimento LAN, desde que o plugin realmente esteja na mesma máquina/namespace do servidor.
6. Clique **Test and connect**. A conexão somente é confirmada após a descoberta REST funcionar.
7. Escolha um dispositivo/ação e confira o estado atual no botão da Ulanzi.

## HTTP LAN: o que está protegido (e o que não está)

- **HTTP e WS não criptografam o token**. Qualquer agente capaz de interceptar o tráfego da rede pode observar ou alterar comandos e credenciais. Use somente LAN confiável. HTTPS segue como modo recomendado.
- A confirmação de HTTP LAN é desmarcada por padrão. Mudança da URL ou do modo limpa a confirmação.
- O plugin aceita somente IPv4 privado **RFC1918** (10/8, 172.16/12, 192.168/16) ou hostname terminado em `.local` cuja resolução resulte somente em IPv4 privado.
- O nome `.local` é resolvido novamente antes de **cada conexão REST/WS**; o socket utiliza o IP aprovado, sem executar nova resolução interna. Se o destino DNS mudar, o plugin bloqueia a conexão e exige novo pareamento/autorização.
- O IP aprovado e a URL exata são armazenados junto ao token pelo **DPAPI CurrentUser** do Windows somente se a opção **Lembrar credenciais** estiver marcada. Caso contrário, a aprovação vale somente para o processo atual.
- Em caso de mudança da rede local, endereço DHCP ou dispositivo, desconecte e autorize novamente. Uma conexão HTTP não pode autenticar criptograficamente a identidade do servidor; o pin evita troca de IP por DNS, não uma interceptação local ativa nem reutilização maliciosa do mesmo IP.
- HTTP público, URLs com usuário/senha, caminho, consulta ou fragmento e redirecionamentos para outro destino são bloqueados.
- Certificados HTTPS inválidos continuam sendo rejeitados; não existe opção de ignorar TLS.

## Falhas frequentes

- **HTTP LAN requires explicit authorization:** selecione HTTP LAN e marque a autorização; o endereço deve ser privado ou `.local`.
- **Home Assistant DNS destination changed:** o servidor `.local` resolveu para outro IP; conecte e autorize novamente após verificar seu roteador.
- **Hostname resolved outside the authorized local network:** resolução não é privada; não tente contornar com host público.
- **TLS certificate error:** confirme a validade e a cadeia do certificado no endereço HTTPS.
- **HTTP 401:** gere um token válido no Home Assistant.
- **Sem dispositivos:** verifique a conta, a conectividade e se os domínios das entidades são suportados pelo plugin.

**Nunca cole tokens, URLs internas ou registros de autenticação em issues e chats.** O Ulanzi Studio recebe apenas mensagens de status do provedor; o token não é salvo nas configurações dos botões.

## Verificação no Home Assistant real

- HTTPS via Tailscale: `https://homeassistant.tail6132fe.ts.net`
- HTTP LAN: informar o IP do servidor identificado no roteador (não adivinhar).
- Testar autorização, listagem, comandos, eventos WebSocket, reinício e reconexão. O Gate testa comportamento de rede simulado e não substitui um D200 real.

Documentação oficial:
- https://contributors.home-assistant.io/core/internals/rest-api/
- https://contributors.home-assistant.io/core/internals/websocket-api/
