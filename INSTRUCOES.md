# A Casa dos 20 — Guia de Manutenção

## Acesso ao Projeto

- **Plataforma:** Replit (replit.com)
- **Admin da app:** `quinzinhooliveiraa@gmail.com` (login com Google)
- **Base de dados:** Neon PostgreSQL (externa, ~80 utilizadores reais)

---

## Secrets e Configurations

No Replit, há dois tipos de variáveis de ambiente:
- **Secrets** → informação sensível, nunca visível (Tools → Secrets)
- **Configurations** → valores não sensíveis, visíveis (Tools → Secrets → "New configuration")

### Secrets

| Chave | Para que serve |
|-------|---------------|
| `NEON_DATABASE_URL` | Ligação à base de dados (Neon PostgreSQL) |
| `GOOGLE_CLIENT_ID` | Login com Google |
| `GOOGLE_CLIENT_SECRET` | Login com Google |
| `GOOGLE_API_KEY` | Serviços Google adicionais |
| `SESSION_SECRET` | Segurança das sessões de utilizador |
| `VAPID_PRIVATE_KEY` | Notificações push (chave privada — nunca partilhar) |
| `STRIPE_SECRET_KEY` | Pagamentos (backend) |
| `STRIPE_PUBLISHABLE_KEY` | Pagamentos (frontend) |
| `BREVO_API_KEY` | Envio de emails (Brevo) |
| `SLACK_TEST_API_KEY` | Notificações internas via Slack |

### Configurations (valores não sensíveis)

| Chave | Valor atual |
|-------|-------------|
| `VAPID_PUBLIC_KEY` | `BFWf1qCLJrnOiDrZZLmAeQHnAedp_ycyifaCZogdcyk_-aqx_J-c11XzQQpa8NcAb_TerKj-Zy3-QHFfXH8nBmk` |
| `VAPID_SUBJECT` | `mailto:quinzinhooliveiraa@gmail.com` |

> **Importante sobre VAPID:** O par de chaves público/privado tem de ser sempre o mesmo.
> Se gerares novas chaves, todos os utilizadores perdem as subscrições de notificações
> e têm de voltar a aceitar na próxima visita.
>
> Chave pública atual:
> `BFWf1qCLJrnOiDrZZLmAeQHnAedp_ycyifaCZogdcyk_-aqx_J-c11XzQQpa8NcAb_TerKj-Zy3-QHFfXH8nBmk`

---

## Como Gerar Novas Chaves VAPID (só se necessário)

```bash
npx web-push generate-vapid-keys
```

Copia o resultado e actualiza **ambas** as chaves no Replit Secrets
(`VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`).

---

## Como Reiniciar a Aplicação

1. No Replit, clica no botão **Run** (ou vai ao painel Workflows → Start application → Restart)
2. Aguarda a mensagem `serving on port 5000` nos logs

Se o servidor não arrancar, verifica os logs em busca de erros.

---

## Painel de Administração

Acede em: `https://SEU_DOMINIO/admin`

O que podes fazer:
- Ver estatísticas de utilizadores (activos, novos, por hora/dia)
- Enviar notificações push a todos os utilizadores
- Configurar notificações automáticas (activar/desactivar, ajustar horários)
- Gerir utilizadores (bloquear, dar acesso premium, ver detalhes)
- Ver subscrições Stripe activas

---

## Notificações Automáticas

O sistema envia notificações push automáticas entre as **07h00 e as 23h00 (hora de Brasília)**.

Tipos disponíveis (configuráveis no painel admin):

| Tipo | Quando é enviado |
|------|-----------------|
| Exercício do Dia | Utilizador tem jornada activa |
| Reflexão da Noite | Utilizador não escreveu no diário hoje |
| Reflexão do Dia | Utilizador não escreveu no diário hoje |
| Check-in de Humor | Não fez check-in hoje |
| Streak em Risco | Sem escrever há 2-7 dias |
| Celebração de Streak | Múltiplo de 7 entradas no mês |
| Nudge de Jornada | Jornada em curso parada há 3+ dias |
| Re-engagement | Sem actividade há 5+ dias |
| Motivação Diária | Reflexão do livro (entre 20h-23h) |
| Lembrete Diário | Lembrete matinal (entre 7h-10h) |
| Começa uma Jornada | Nunca iniciou jornada |

---

## Base de Dados

- **Não usar** `DATABASE_URL` — usar sempre `NEON_DATABASE_URL`
- Datas estão guardadas em UTC sem timezone. Para converter para hora de Brasília em SQL:
  ```sql
  (created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo'
  ```
- Para aplicar alterações ao schema da base de dados:
  ```bash
  npm run db:push
  ```

---

## Preços por Geo-localização

O sistema detecta automaticamente o país do utilizador e ajusta os preços:
- **Brasil:** preço em BRL
- **Portugal / outros países:** preço em EUR

A lógica está em `server/routes.ts` (função `getGeoPrice`) e usa cache de 1 hora por IP.

---

## Ficheiros Importantes

```
server/
  routes.ts        — Todas as rotas da API e lógica de negócio
  storage.ts       — Interface com a base de dados
  index.ts         — Arranque do servidor e agendadores
  brevoClient.ts   — Envio de emails via Brevo
  adminNotify.ts   — Notificações push de administrador

client/src/
  pages/
    Admin.tsx      — Painel de administração
    Book.tsx       — Leitura do livro (bloqueada por Stripe)
    Journal.tsx    — Diário
    Journey.tsx    — Jornadas de 30 dias
    Home.tsx       — Página principal
  hooks/
    useGeoPrice.ts — Detecção de preço por país

shared/
  schema.ts        — Modelo de dados (Drizzle ORM)

.env.example       — Lista de todas as variáveis de ambiente necessárias
INSTRUCOES.md      — Este ficheiro
```

---

## Em Caso de Problemas

### A aplicação não arranca
1. Verifica os logs no Replit (painel Workflows)
2. Procura erros a vermelho — normalmente indica qual o ficheiro e linha

### As notificações não chegam
1. Confirma que `VAPID_PRIVATE_KEY` está em Secrets
2. Confirma que `VAPID_PUBLIC_KEY` coincide com o par privado
3. Verifica se os utilizadores têm notificações activadas no browser

### Erro de base de dados
1. Confirma que `NEON_DATABASE_URL` está em Secrets
2. Acede ao painel Neon (neon.tech) e verifica se a base de dados está activa

### Login Google não funciona
1. Confirma que `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão em Secrets
2. Verifica na Google Cloud Console se o domínio está autorizado nos redirect URIs

---

*Última actualização: Março 2026*
