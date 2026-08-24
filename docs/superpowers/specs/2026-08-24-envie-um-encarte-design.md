# Envie um encarte (lead Instagram) — Design

**Data:** 2026-08-24  
**Status:** Aprovado em conversa; aguardando revisão do arquivo

## Objetivo

Permitir que supermercado ou pessoa solicite cadastro de um Instagram para monitoramento de encartes, via formulário público. O módulo **apenas recebe e persiste** os dados — sem admin, e-mail, ingestão automática ou qualquer outra funcionalidade nesta entrega.

## Decisões

| Tema | Decisão |
|------|--------|
| Persistência | Banco do snap-api (`POST` público em `jbo_public`) |
| Rota UI | `/envie-um-encarte` |
| Entradas | Link no menu + CTA na página `/encartes` |
| Papel | Radio obrigatório: **Usuário** ou **Comerciante** |
| Sucesso | Mensagem na mesma página; formulário some / deixa de ser editável |
| Instagram | Opcional; aceitar `@handle` ou URL e normalizar o que for possível |
| Auth | Público, sem login |
| Admin / e-mail / monitoramento | Fora de escopo |

## Entradas na UI

1. **Menu** (`HeaderMenu`): item **Envie um encarte** (próximo de Encartes / Lojas).
2. **`/encartes`**: botão CTA **Envie um encarte** no intro, apontando para `/envie-um-encarte`.

## Página `/envie-um-encarte`

Layout alinhado a páginas de conteúdo (`/lojas`, `/privacidade`): `AppHeader` + `main` com largura ~720px.

### Conteúdo informativo

Deve deixar claro que:

- Buscamos informações de encartes no **Instagram do mercado**.
- Se o mercado **não tiver Instagram**, o campo deve ficar **em branco**.
- Envio nativo de encartes pela plataforma está **em desenvolvimento**; sem Instagram, o pedido fica na fila aguardando essa evolução.

### Formulário

| Campo | Obrigatório | UI |
|-------|-------------|-----|
| Nome do mercado | sim | texto |
| Nome do solicitante | sim | texto |
| E-mail do solicitante | sim | e-mail |
| Instagram do mercado | não | texto |
| Sou | sim | radio: Usuário / Comerciante |

Validação no browser (HTML5 + checagem mínima) e no backend. Em erro de API/rede: mensagem discreta; formulário permanece. Em sucesso: formulário some e aparece confirmação (ex.: “Recebemos seu pedido”).

## API (snap-api)

### Endpoint

`POST /api/public/jbo/encarte-leads`

- App: `apps/jbo_public`
- Sem autenticação; rate limit (mesmo espírito dos writes de push)
- Sem listagem pública nem GET

### Body (JSON)

```json
{
  "store_name": "Bistek Supermercados",
  "requester_name": "Maria Silva",
  "requester_email": "maria@exemplo.com",
  "instagram": "@bistek",
  "role": "user"
}
```

| Campo | Tipo | Notas |
|-------|------|-------|
| `store_name` | string | obrigatório, trim, não vazio |
| `requester_name` | string | obrigatório |
| `requester_email` | string | obrigatório, e-mail válido |
| `instagram` | string \| null | opcional; vazio → null; normalizar handle quando possível |
| `role` | enum | `user` \| `merchant` (UI: Usuário / Comerciante) |

### Model

`JboEncarteLead`: campos acima + `id` (UUID) + `created_at`. Sem status de workflow nesta entrega.

### Resposta

`201` com `{ "id", "created_at" }` (sem ecoar dados sensíveis além do necessário). Erros de validação: `422`. Rate limit: `429`.

## Front (Nuxt)

- Página: `app/pages/envie-um-encarte.vue`
- Submit via `jboSend('POST', '/encarte-leads', body)`
- Estilos: tokens existentes (`--navy`, `--yellow`, `--muted`, inputs no padrão de `lojas.vue`)

## Testes

- Front: contratos por source — link no menu, CTA em encartes, rota, campos obrigatórios/opcional, radio, chamada `jboSend`.
- API: POST válido; rejeição de obrigatórios ausentes; Instagram opcional; `role` inválido; rate limit básico se o padrão do app já for testável assim.

## Fora de escopo

- Painel admin / listagem interna
- Notificação por e-mail
- Ativar monitoramento Instagram automaticamente
- Upload de imagem de encarte
- Ambiente de produção (deploy loc quando solicitado)
- Alterações em `apps/instagram`

## Critérios de aceite

1. Menu e `/encartes` expõem **Envie um encarte** e navegam para `/envie-um-encarte`.
2. Página explica Instagram / campo opcional / nativo em desenvolvimento.
3. Só envia com mercado, solicitante, e-mail e papel preenchidos.
4. Instagram vazio é aceito e gravado como nulo/ausente.
5. Sucesso mostra confirmação na mesma página sem reenvio acidental do form.
6. Registro persiste em `JboEncarteLead` via `POST /api/public/jbo/encarte-leads`.
