# Joinville Boas Ofertas — plataforma pública (Nuxt SSR)

Site de ofertas públicas de Joinville. Consome `/api/public/jbo/*` do snap-api
via proxy nginx (same-origin). Sem autenticação.

Repositório: https://github.com/kaacyn/joinvilleboasofertas

## Ambientes locais

| Pasta | Branch | Domínio | Porta host |
|-------|--------|---------|------------|
| `prd-joinvilleboasofertas` | `main` | https://joinvilleboasofertas.com | 8091 |
| `dev-joinvilleboasofertas` | `develop` | https://joinvilleboasofertas-loc-app.cacin.dev | 8092 |

## Desenvolvimento

```bash
cd dev-joinvilleboasofertas
git checkout develop && git pull --ff-only origin develop
cp .env.example .env   # se ainda não existir
docker compose up -d --build
```

Serviços:

- `app` (`jbo-dev-nuxt`) — Nuxt/Nitro na porta 3000 (rede `snap-net`)
- `proxy` (`jbo-dev-web`) — nginx `:8092` → Nuxt; `/api/` → `snap-api-dev:8000`

Variáveis (`.env`): `NUXT_API_BASE` (snap-api na rede Docker, só SSR), `NUXT_PUBLIC_SITE_URL` e
`NUXT_API_TOKEN` — mesmo valor de `JBO_INTERNAL_TOKEN` no snap-api; o SSR manda o header
`X-JBO-Internal` e fica fora do rate limit por IP (o browser continua limitado por visitante).

## Rotas

| Rota | Função |
|------|--------|
| `/` | Home vitrine: carrossel "Maior economia do dia" (5 ofertas sorteadas, com bolinhas), categorias, carrosséis de Mercearia, Açougue, Bebidas e Hortifruti (ordem por economia), termina hoje e novas ofertas; qualquer filtro/busca vira lista (`?ends_today=1` lista só o que vence hoje) |
| `/oferta/{id}` | Redireciona para o produto naquela loja |
| `/produto/{slug}/{loja}` | Produto + preço na loja, recorte do encarte e preços por loja; barra acima do título com Reportar um erro, Compartilhar e Sino (este mercado ou todos) |
| `/loja/{slug}` | Ofertas da loja |
| `/lojas` | Lista de lojas |
| `/encartes` | Lista de encartes (filtro por loja) |
| `/encarte/{id}` | Foto do encarte + ofertas extraídas, com hotspots clicáveis na foto |
| `/envie-um-encarte` | Formulário Envie um encarte (lead Instagram) |
| `/perguntas-frequentes` | Perguntas frequentes (FAQ) |
| `/categoria/{slug}` | Ofertas da categoria |
| `/privacidade` | Política de privacidade |
| `/robots.txt`, `/sitemap.xml` | SEO |

## Ofertas (contrato do snap-api)

As ofertas vêm da extração do encarte pelo Mega Brain (`/api/public/jbo/offers`,
`/products/{slug}`, `/encartes/{id}/offers`). Campos que a vitrine usa:

- `price` / `club_price`: o card destaca o preço de clube quando existe (rótulo do
  programa da loja em `establishment_loyalty_program_name`) e risca o regular ao lado.
- `pricing.basis`: `unit` (R$ 9,99), `lot` ("2 por R$ 10,00" + "R$ 5,00 cada") ou
  `per_fraction` ("R$ 39,90/kg", "R$ 3,99 a cada 100 g") — helpers em
  `app/utils/offerPrice.ts`.
- `brand` + `quantity_label`: entram no título completo montado por `offerTitle`
  (`app/utils/offerTitle.ts`): nome + marca + volume, ex. "Óleo de Soja Coamo 900 ml",
  sem repetir marca ou volume que o nome já traga. Vale para card, tile, hero, página do
  produto (h1, SEO, share, JSON-LD), hotspots do encarte e autocomplete
  (`/products/suggest` devolve `brand` e `quantity_label` por produto).
- `unit_price` + `unit_price_base`: preço por 100 g / 100 ml / un para comparação.
- `promotion` e `offer_addresses`: chips "Leve 3 pague 2" e "Só em {bairro}".
- `encarte_bbox`: posição (0..1) da oferta na foto; a página do produto abre o
  lightbox já destacando essa área e a página do encarte mostra hotspots.

## Página do produto — barra de ações

`ProductActionsBar` (acima do `h1`) tem três botões só com ícone: **Reportar um erro**
(`ReportOfferSheet`: motivo, comentário — obrigatório em "Outro" — e contato opcional;
`POST /api/public/jbo/offer-reports`), **Compartilhar** (`useShareLink`) e **Sino**
(`ProductFollowSheet`). O sino segue o produto **só no mercado da página** ou **em todos os
mercados** (`/push/product-follows*`); nenhuma opção vem marcada e tocar já ativa. Mercados
escolhidos em páginas diferentes se somam; "todos" substitui a lista. A linha à esquerda
mostra onde o aviso vale ("Avisos neste mercado", "Avisos em todos os mercados"…) e os avisos
passageiros. Regras e textos em `app/utils/productFollow.ts`; Web Push compartilhado com a
loja em `app/utils/webPush.ts`.

## Tema e tipografia

Tokens em `app/assets/css/tokens.css` (tema claro): `--bg #F3F4F6`, `--surface #FFFFFF`,
`--line #E6E8EC`, texto `--ink/--ink-2/--ink-3`, marca `--navy`, destaque `--yellow` /
`--yellow-soft` / `--yellow-ink`, alerta `--red` / `--red-soft`, informação `--blue` / `--blue-soft`.
Inter no corpo (`--body`), Montserrat em títulos, marca e preços (`--head`).
`--white` e `--navy-light` não existem mais — texto sobre fundo escuro usa `--on-dark`.

Capturas: `npm run screens` (ver cabeçalho de `scripts/screens.cjs`).

## Spec / plano

- `docs/superpowers/specs/2026-08-12-jbo-plataforma-publica-design.md`
- `docs/superpowers/plans/2026-08-12-jbo-nuxt-platform.md`
- `docs/superpowers/specs/2026-09-11-jbo-home-vitrine-tema-claro-design.md` e `docs/superpowers/plans/2026-09-11-jbo-home-vitrine-tema-claro.md` (home vitrine + tema claro)
- Integração Mega Brain (contrato de ofertas): `snap-api/docs/superpowers/specs/2026-09-09-integracao-mega-brain-design.md`
