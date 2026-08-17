# Módulo público Encartes (JBO) — Design

**Data:** 2026-08-16  
**Status:** Aprovado em conversa; aguardando revisão do arquivo

## Objetivo

Expor no site público Joinville Boas Ofertas uma página de **encartes** (PhotoScan do dataset), com a mesma regra de elegibilidade do Snap Studio para publicação Instagram: status **`pending` ou `approved`**. Visitantes filtram por loja, veem a lista ordenada por data de vencimento e abrem a imagem em lightbox.

## Decisões

| Tema | Decisão |
|------|--------|
| Onde | Site Nuxt JBO + API `jbo_public` |
| Rota UI | `/encartes` |
| Menu | Item **Encartes** (antes de Privacidade) |
| Status | `dataset_status ∈ {pending, approved}` — **não** expor status na UI |
| Clique | Lightbox com imagem XL |
| Vencidos | Incluir; selo visual **Expirado** quando `promo_active=false` |
| Horizonte | Só encartes com `promo_ends_on <= hoje + 7 dias` (vencidos continuam); ver `2026-08-17-encartes-horizonte-7-dias-design.md` |
| Cadastro | Card mostra “Cadastrado há…” a partir de `created_at`; ver `2026-08-17-encartes-cadastrado-ha-design.md` |
| Ordenação | Fixa: `promo_ends_on DESC`, desempate `created_at DESC` |
| Filtro | Por loja (`establishment_id`); opção “Todas” |
| Auth | Público (sem login), como o restante do JBO |

## Escopo de dados (API)

### Endpoint

`GET /api/public/jbo/encartes`

Query:

| Param | Tipo | Descrição |
|-------|------|-----------|
| `establishment_id` | UUID opcional | Filtra por loja |
| `cursor` | string opcional | Paginação |
| `limit` | int opcional | Default 20; mínimo 1 e máximo 50 |

`GET /api/public/jbo/encartes/stores`

Retorna `{ "items": [{ "id", "name", "slug" }] }`, ordenado pelo nome da
loja e sem duplicações. Só inclui lojas com ao menos um encarte elegível pelos
mesmos critérios do feed. Este endpoint é a fonte autocontida do filtro da UI;
o frontend não depende do catálogo público de estabelecimentos.

### Critérios de inclusão

1. `dataset_status` ∈ `{pending, approved}`
2. Escopo JBO aplicado diretamente ao queryset de `PhotoScan`
   (`apply_jbo_scope`: não admin-only + allowlist ou bbox)
3. Imagem presente (`image` com key utilizável)
4. `promo_ends_on` **não nulo** (necessário para ordenar e sinalizar expiração)
5. `promo_ends_on <= hoje + 7 dias` (horizonte; vencidos no passado continuam)

### Payload do item (sem status)

```json
{
  "id": "uuid",
  "establishment_id": "uuid",
  "establishment_name": "string",
  "establishment_slug": "string",
  "establishment_logo_url": "string|null",
  "promo_starts_on": "YYYY-MM-DD|null",
  "promo_ends_on": "YYYY-MM-DD",
  "promo_active": true,
  "created_at": "2026-08-17T12:34:56.789012-03:00",
  "image_url": "string|null",
  "image_url_xl": "string|null"
}
```

- `promo_active`: `promo_ends_on >= hoje` (e, se houver, `promo_starts_on <= hoje`); espelha a ideia de vigência das ofertas JBO.
- `image_url` / `image_url_xl`: URLs assinadas via `image_to_url_dict` (presets `md` e `xl`), no mesmo espírito do dataset admin.

### Resposta de página

```json
{
  "items": [ /* ... */ ],
  "next_cursor": "string|null"
}
```

## UI (Nuxt)

### Página `/encartes`

- Header padrão + título **Encartes** e frase curta de apoio
- Filtro de loja: select/chip alimentado por `GET /encartes/stores` + “Todas”
- Lista/grid de cards: thumb, nome da loja, validade; selo **Expirado** se `!promo_active`
- Clique no card → lightbox (imagem XL); fechar com ESC, clique fora ou botão
- “Carregar mais” quando houver `next_cursor`
- SEO: title/description próprios; sitemap inclui `/encartes`

### Menu

Em `HeaderMenu.vue`, link **Encartes** → `/encartes`, acima de Privacidade.

## Fora de escopo

- Página de detalhe `/encarte/{id}`
- Exibir badge Pendente/Aprovado
- Overlays de regiões / produtos do encarte
- Edição de validade ou aprovação
- Filtro por intervalo de datas, origem Instagram/manual ou busca por produto
- Alterar regras do Snap Studio ou da publicação Instagram

## Critérios de sucesso

1. Menu mostra **Encartes** e a rota `/encartes` responde 200.
2. Lista só traz encartes `pending`/`approved` no escopo JBO, com imagem, `promo_ends_on` e dentro do horizonte de 7 dias (vencidos inclusos).
3. Ordem sempre por vencimento decrescente.
4. Filtro por loja funciona; “Todas” remove o filtro.
5. Clique abre lightbox; vencidos aparecem com selo **Expirado**.
6. Status do dataset **não** aparece na UI nem no JSON público.
7. Sitemap lista `/encartes`.

## Repos envolvidos

| Repo | Papel |
|------|--------|
| `dev-snap-api` | Endpoint + testes `jbo_public` |
| `dev-joinvilleboasofertas` | Página, menu, lightbox, sitemap |
