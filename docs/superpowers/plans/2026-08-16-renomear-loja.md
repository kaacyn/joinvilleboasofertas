# Renomear mercado/estabelecimentos → loja — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar labels e URLs públicas de mercado/estabelecimentos para loja/lojas no app Nuxt JBO, sem redirects.

**Architecture:** Renomear arquivos de página Nuxt (`estabelecimentos` → `lojas`, `mercado` → `loja`), atualizar copy de menu/filtros/busca e todos os `NuxtLink` internos. No sitemap do Nuxt, trocar path estático e reescrever `/mercado/` → `/loja/` nas URLs vindas da API (a API ainda emite `/mercado/` e fica fora deste plano).

**Tech Stack:** Nuxt 3, Vue 3, TypeScript, Docker Compose (container `jbo-dev-nuxt`)

## Global Constraints

- Sem redirects de `/estabelecimentos` ou `/mercado/*`
- Não renomear campos da API (`establishment_slug`, `/establishments`, etc.)
- Não reescrever textos jurídicos amplos em termos/privacidade
- Escopo: `dev-joinvilleboasofertas` apenas (API Snap fora, salvo remap defensivo no sitemap Nuxt)
- Idioma da UI: português; labels finais **Lojas** / **loja**

## File map

| Arquivo | Responsabilidade |
|---------|------------------|
| `app/pages/lojas.vue` (ex-`estabelecimentos.vue`) | Lista pública `/lojas` |
| `app/pages/loja/[slug].vue` (ex-`mercado/[slug].vue`) | Detalhe `/loja/{slug}` |
| `app/components/HeaderMenu.vue` | Link do menu |
| `app/components/offers/FilterBar.vue` | Chip “Lojas” |
| `app/components/offers/FiltersSheet.vue` | Seção mobile “Lojas” |
| `app/components/offers/SearchBar.vue` | Placeholder da busca |
| `app/components/offers/OfferCard.vue` | Link para loja |
| `app/pages/oferta/[id].vue` | Link + copy “outras lojas” |
| `server/routes/sitemap.xml.ts` | Paths estáticos + remap API |
| `README.md` | Tabela de rotas |

---

### Task 1: Rotas de página `/lojas` e `/loja/{slug}`

**Files:**
- Move: `app/pages/estabelecimentos.vue` → `app/pages/lojas.vue`
- Move: `app/pages/mercado/[slug].vue` → `app/pages/loja/[slug].vue`
- Delete: arquivos/pastas antigas após o move

**Interfaces:**
- Consome: `jboGet('/establishments')` e `jboGet(\`/establishments/${slug}\`)` (inalterados)
- Produz: rotas Nuxt `/lojas` e `/loja/:slug`

- [ ] **Step 1: Mover a listagem**

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas
git mv app/pages/estabelecimentos.vue app/pages/lojas.vue
```

- [ ] **Step 2: Atualizar copy e link em `lojas.vue`**

Substituir textos e o destino do link:

| Antes | Depois |
|-------|--------|
| `Estabelecimentos` (h1 e title) | `Lojas` |
| `Supermercados e mercados ativos…` | `Lojas ativas em Joinville e região.` |
| `Buscar estabelecimento` | `Buscar loja` |
| `Nenhum estabelecimento encontrado.` | `Nenhuma loja encontrada.` |
| `Lista de estabelecimentos` | `Lista de lojas` |
| `` `/mercado/${est.slug}` `` | `` `/loja/${est.slug}` `` |
| description SEO com “supermercados e mercados” | `Lista de lojas com ofertas em Joinville e região.` |

Manter `id="est-search"` e a chave `jbo-establishments` (internos; não são URL).

- [ ] **Step 3: Mover a página de detalhe**

```bash
mkdir -p app/pages/loja
git mv app/pages/mercado/\[slug\].vue app/pages/loja/\[slug\].vue
rmdir app/pages/mercado 2>/dev/null || true
```

- [ ] **Step 4: Atualizar copy/CSS keys em `loja/[slug].vue`**

| Antes | Depois |
|-------|--------|
| classes `mercado-head*` | `loja-head*` (template + CSS) |
| `Sem ofertas vigentes neste mercado.` | `Sem ofertas vigentes nesta loja.` |
| chave `mercado-${slug}` | `loja-${slug}` |
| `Mercado não encontrado` | `Loja não encontrada` |
| title fallback `'Mercado'` | `'Loja'` |

Endpoint `jboGet(\`/establishments/${slug}\`)` permanece.

- [ ] **Step 5: Verificar ausência das pastas antigas**

```bash
test ! -e app/pages/estabelecimentos.vue
test ! -e app/pages/mercado
test -f app/pages/lojas.vue
test -f app/pages/loja/\[slug\].vue
```

Expected: todos exit 0.

- [ ] **Step 6: Commit**

```bash
git add app/pages/lojas.vue app/pages/loja
git commit -m "$(cat <<'EOF'
feat: renomear rotas estabelecimentos/mercado para lojas/loja

EOF
)"
```

---

### Task 2: Menu, filtros, busca e links internos

**Files:**
- Modify: `app/components/HeaderMenu.vue`
- Modify: `app/components/offers/FilterBar.vue`
- Modify: `app/components/offers/FiltersSheet.vue`
- Modify: `app/components/offers/SearchBar.vue`
- Modify: `app/components/offers/OfferCard.vue`
- Modify: `app/pages/oferta/[id].vue`

**Interfaces:**
- Consome: rotas `/lojas` e `/loja/:slug` da Task 1
- Produz: navegação e copy alinhadas a “loja”

- [ ] **Step 1: Menu**

Em `HeaderMenu.vue`:

```vue
<NuxtLink
  to="/lojas"
  class="hmenu__item"
  role="menuitem"
  @click="close"
>
  Lojas
</NuxtLink>
```

- [ ] **Step 2: FilterBar**

Trocas de string (props/textos visíveis apenas):

| Antes | Depois |
|-------|--------|
| `label="Mercados"` | `label="Lojas"` |
| `placeholder="Buscar supermercado"` | `placeholder="Buscar loja"` |
| `aria-label="Buscar supermercado"` | `aria-label="Buscar loja"` |
| `Nenhum supermercado encontrado` | `Nenhuma loja encontrada` |
| `Sem mercados disponíveis` | `Sem lojas disponíveis` |

Não renomear `establishmentIds`, `draftEstIds`, `filteredEstablishments`, `applyEstablishments`.

- [ ] **Step 3: FiltersSheet**

Mesmas trocas de copy da seção Mercados → Lojas / buscar loja / nenhuma loja encontrada.

- [ ] **Step 4: SearchBar**

```vue
placeholder="Buscar produto ou loja…"
```

- [ ] **Step 5: OfferCard e oferta**

```vue
:to="`/loja/${offer.establishment_slug}`"
```

Em `oferta/[id].vue`: mesmo `to` e texto `Ver preços deste produto em outras lojas`.

- [ ] **Step 6: Gate de links antigos no app**

```bash
rg -n '/mercado|/estabelecimentos' app --glob '*.{vue,ts}'
```

Expected: sem matches.

- [ ] **Step 7: Commit**

```bash
git add app/components/HeaderMenu.vue \
  app/components/offers/FilterBar.vue \
  app/components/offers/FiltersSheet.vue \
  app/components/offers/SearchBar.vue \
  app/components/offers/OfferCard.vue \
  app/pages/oferta/\[id\].vue
git commit -m "$(cat <<'EOF'
feat: alinhar menu, filtros e links à nomenclatura loja

EOF
)"
```

---

### Task 3: Sitemap, README e deploy de verificação

**Files:**
- Modify: `server/routes/sitemap.xml.ts`
- Modify: `README.md`

**Interfaces:**
- Consome: resposta `{ urls: { loc: string }[] }` de `/api/public/jbo/sitemap` (ainda pode conter `/mercado/…`)
- Produz: `sitemap.xml` com `/lojas` e `/loja/…` apenas

- [ ] **Step 1: Atualizar sitemap Nuxt**

Em `server/routes/sitemap.xml.ts`, paths estáticos e remap:

```ts
let paths: string[] = ['/', '/lojas', '/privacidade', '/termos']
try {
  const data = await $fetch<{ urls: { loc: string }[] }>(
    `${apiBase}/api/public/jbo/sitemap`,
  )
  const fromApi = (data.urls || []).map(u =>
    u.loc.replace(/^\/mercado\//, '/loja/'),
  )
  paths = [
    ...new Set([
      '/',
      '/lojas',
      '/privacidade',
      '/termos',
      ...fromApi,
    ]),
  ]
}
catch {
  // Mantém paths mínimos se a API estiver indisponível no build/SSR.
}
```

- [ ] **Step 2: README**

Na tabela de rotas:

```markdown
| `/produto/{slug}` | Produto + mais barato + preços por loja |
| `/loja/{slug}` | Ofertas da loja |
| `/lojas` | Lista de lojas |
```

Remover a linha `/mercado/{slug}`.

- [ ] **Step 3: Gate final de strings de rota**

```bash
rg -n '/mercado|/estabelecimentos' app server README.md --glob '!docs/**'
```

Expected: sem matches (exceto se algum comentário residual — zero).

- [ ] **Step 4: Rebuild do container**

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas
docker compose up -d --build app
```

Expected: build Nuxt completa e container `jbo-dev-nuxt` recriado.

- [ ] **Step 5: Smoke HTTP**

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://joinvilleboasofertas-loc-app.cacin.dev/lojas
curl -s https://joinvilleboasofertas-loc-app.cacin.dev/sitemap.xml | head -40
curl -s -o /dev/null -w '%{http_code}\n' https://joinvilleboasofertas-loc-app.cacin.dev/estabelecimentos
curl -s -o /dev/null -w '%{http_code}\n' https://joinvilleboasofertas-loc-app.cacin.dev/mercado/giassi-supermercados
```

Expected:

- `/lojas` → `200`
- sitemap contém `/lojas` e **não** `/estabelecimentos`; locs de loja usam `/loja/`
- `/estabelecimentos` e `/mercado/...` → `404` (sem redirect)

- [ ] **Step 6: Commit**

```bash
git add server/routes/sitemap.xml.ts README.md
git commit -m "$(cat <<'EOF'
fix: atualizar sitemap e README para rotas /lojas e /loja

EOF
)"
```

---

## Spec coverage

| Requisito da spec | Task |
|-------------------|------|
| `/lojas` e `/loja/{slug}` | 1 |
| Menu e filtros “Lojas” | 2 |
| SearchBar “loja” | 2 |
| Links internos | 1–2 |
| Sitemap `/lojas` (+ remap) | 3 |
| Sem redirects | 3 smoke |
| API fields intactos | todas (não tocar) |
| Deploy/verificação | 3 |

## Placeholder / consistency self-review

- Sem TBD/TODO.
- Remap `/mercado/` → `/loja/` documentado como ponte até eventual mudança na API.
- Classes CSS e chaves `useAsyncData` alinhadas a `loja` nas páginas movidas; IDs internos `establishment*` nos filtros permanecem de propósito.
