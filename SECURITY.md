# Política de segurança

Não abra issues públicas contendo chaves de API, tokens, endereços internos, logs brutos ou vulnerabilidades exploráveis.

Para o MVP, `HA_URL` e `HA_TOKEN` são herdados do ambiente do processo Ulanzi Studio. Nunca comite tokens nem os salve em configurações de botões. A configuração por variáveis de ambiente é temporária: uma versão de produção exige um cofre de credenciais com proteção do sistema operacional.

O conjunto de comandos é restrito. Fechaduras, alarmes e dispositivos de risco estão explicitamente excluídos. HTTP é permitido somente no loopback; acesso remoto exige HTTPS com validação de certificado.

Use um canal privado de reporte de vulnerabilidades.
