# Supabase Edge Functions Backend (Catapult Integration)

## Estrutura
```
supabase/functions/
  _shared/            # utilidades comuns
  catapult/           # integração Catapult (connect, webhook, services, utils, mocks)
  tests/              # testes (placeholders)
  cron/               # funções agendadas
```

## Funções principais
- `catapult/connect` POST: registra integração de um clube e gera `webhook_uuid`.
- `catapult/webhook` POST: recebe payload, valida assinatura (se houver), normaliza métricas.
- `cron/retryFailedWebhooks`: reprocessa webhooks com status `error`.

## Variáveis de ambiente (.env)
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CATAPULT_API_BASE=https://api.catapultsports.com
CATAPULT_API_KEY=chave-real-ou-mock
MOCK_MODE=true
```

## Desenvolvimento
Instale o CLI do Supabase e rode:
```bash
supabase functions serve catapult/connect
supabase functions serve catapult/webhook
```

Cada função deve ser chamada via:
```
POST http://localhost:54321/functions/v1/catapult/connect
POST http://localhost:54321/functions/v1/catapult/webhook/<webhook_uuid>
```

## Próximos Passos
- Implementar criptografia para `api_key_encrypted` (AES-256 ou KMS externo).
- Completar validação real de assinatura (header oficial da Catapult).
- Adicionar retries reais na cron.
- Modularizar para testar handlers diretamente sem `Deno.serve`.
- Expandir normalização (zones dinâmicas, novos provedores).
