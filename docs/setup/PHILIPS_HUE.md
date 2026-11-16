# Philips Hue — configuração local (MVP)

Esta ação usa **exclusivamente a Hue Bridge na rede local**, pela API oficial CLIP v2 (HTTPS), sem login Hue Cloud. Requer Bridge compatível com API v2 e lâmpadas associadas à Bridge.

## Antes de conectar

1. Descubra o IPv4 privado da Bridge em seu roteador ou no aplicativo Hue. Exemplo: `192.168.1.20`.
2. Obtenha a impressão digital SHA-256 do **certificado TLS dessa Bridge**. No PowerShell, substitua o IP:

```powershell
$ip = '192.168.1.20'
$tcp = [Net.Sockets.TcpClient]::new($ip, 443)
$ssl = [Net.Security.SslStream]::new($tcp.GetStream(), $false, { $true })
try {
  $ssl.AuthenticateAsClient($ip)
  $sha = [Security.Cryptography.SHA256]::Create()
  try { [BitConverter]::ToString($sha.ComputeHash($ssl.RemoteCertificate.GetRawCertData())).Replace('-', '') }
  finally { $sha.Dispose() }
} finally { $ssl.Dispose(); $tcp.Dispose() }
```

Atenção: a impressão digital lida da própria rede é um mecanismo de **confiança no primeiro uso**. Verifique a identidade da Bridge em uma rede de confiança; copiar uma impressão digital de uma conexão interceptada não protege o primeiro pareamento.

3. Na Ulanzi, adicione a ação **Philips Hue**. Informe o IP privado e a impressão digital (64 caracteres hexadecimais, com ou sem dois-pontos).
4. Pressione o **botão físico de pareamento** da Bridge e selecione **Pair Hue Bridge** no Inspector. Se a Bridge negar, repita dentro da janela de pareamento.
5. O plugin solicita uma application key usando `POST /api` via TLS verificado por fingerprint e valida as lâmpadas via `GET /clip/v2/resource/light`. A chave nunca retorna ao Property Inspector; pode ser protegida pelo DPAPI do Windows se o usuário marcar *Lembrar credenciais*.
6. Se você já possuir uma application key válida, informe-a manualmente no campo e use **Test and connect**.

## Compatibilidade da versão inicial

- Descobre luzes em `/clip/v2/resource/light`, lê estado real e executa on/off/toggle com `PUT /clip/v2/resource/light/{id}`.
- Faz sondagens limitadas para confirmar o estado após o comando; não assume sucesso físico a partir do HTTP 200.
- IP **RFC1918** informado explicitamente; não há scan de rede, DNS, eventos SSE, grupos, cenas ou entretenimento nesta entrega.
- A assinatura TLS é conferida antes que a application key seja enviada. A API v2 usa certificado que pode não ser reconhecido pelo conjunto padrão de autoridades do Node.js.
- O plugin aceita conexão de somente uma Bridge por instância do provedor nesta versão. Dispositivos reais ainda exigem validação manual.

Documentação oficial: https://developers.meethue.com/develop/get-started-2/ e https://developers.meethue.com/new-hue-api/
