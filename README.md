# Joinville Boas Ofertas — Página de espera

Página estática "Em breve, novidades" servida por nginx em container Docker com auto-recuperação (`restart: unless-stopped`).

## Subir localmente

```bash
docker compose up -d --build
```

Acesse: http://localhost:8090

## Expor o domínio (Cloudflare Tunnel)

1. No [Cloudflare Zero Trust](https://one.dash.cloudflare.com/), crie um tunnel (ou reutilize um existente).
2. Adicione uma **Public Hostname**:
   - **Subdomain/Domain:** `joinvilleboasofertas.com` (e `www` se desejar)
   - **Service:** `http://web:80`
3. Copie o token do tunnel para `.env`:

```bash
cp .env.example .env
# edite CF_TUNNEL_TOKEN=...
```

4. Suba com o profile `tunnel`:

```bash
docker compose --profile tunnel up -d --build
```

O container `cloudflared` também usa `restart: unless-stopped` — se cair, o Docker reinicia automaticamente.

## DNS

Garanta que o domínio `joinvilleboasofertas.com` está na Cloudflare (nameservers apontando para a Cloudflare). O tunnel cuida do roteamento HTTPS.

## Estrutura

```
site/index.html      — página de espera
nginx/default.conf   — configuração nginx
Dockerfile           — imagem de produção
docker-compose.yml   — web + cloudflared (profile tunnel)
```
