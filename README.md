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

## Rotas

| Rota | Função |
|------|--------|
| `/` | Home: busca, filtros, listagem |
| `/oferta/{id}` | Detalhe da oferta |
| `/produto/{slug}` | Produto + mais barato + preços por loja |
| `/loja/{slug}` | Ofertas da loja |
| `/lojas` | Lista de lojas |
| `/categoria/{slug}` | Ofertas da categoria |
| `/privacidade` | Política de privacidade |
| `/robots.txt`, `/sitemap.xml` | SEO |

## Spec / plano

- `docs/superpowers/specs/2026-08-12-jbo-plataforma-publica-design.md`
- `docs/superpowers/plans/2026-08-12-jbo-nuxt-platform.md`
