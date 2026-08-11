# Joinville Boas Ofertas — Página de espera

Página estática "Em breve, novidades" servida por nginx em Docker (`restart: unless-stopped`).

Repositório: https://github.com/kaacyn/joinvilleboasofertas

## Ambientes locais (duas pastas, mesmo repo)

| Pasta | Branch | Domínio | Porta host |
|-------|--------|---------|------------|
| `prd-joinvilleboasofertas` | `main` | https://joinvilleboasofertas.com | 8091 |
| `dev-joinvilleboasofertas` | `develop` | https://joinvilleboasofertas-loc-app.cacin.dev | 8092 |

O roteamento público usa o **Cloudflare Tunnel** compartilhado com o snap (`snap-net`). Não há `cloudflared` neste compose — as rotas ficam no tunnel `homelab-local-dev`.

### Produção

```bash
cd prd-joinvilleboasofertas
git checkout main && git pull --ff-only origin main
cp .env.example .env   # se ainda não existir
docker compose up -d --build
```

### Desenvolvimento

```bash
cd dev-joinvilleboasofertas
git checkout develop && git pull --ff-only origin develop
cp .env.example .env   # se ainda não existir
docker compose up -d --build
```

## Estrutura

```
site/                — HTML, assets, logo
nginx/default.conf   — configuração nginx
Dockerfile           — imagem nginx alpine
docker-compose.yml   — serviço web (rede snap-net)
.env                 — CONTAINER_NAME e WEB_PORT por ambiente (gitignored)
```

## Git workflow

- **Produção:** commit e push na branch `main` (pasta `prd-joinvilleboasofertas`).
- **Desenvolvimento:** commit e push na branch `develop` (pasta `dev-joinvilleboasofertas`).
- Para levar dev → prod: merge `develop` → `main` e rebuild na pasta prd.
