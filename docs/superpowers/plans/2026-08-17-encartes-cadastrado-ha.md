# Menção “Cadastrado há…” nos cards de encarte — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expor o instante de cadastro de cada encarte e mostrá-lo no card em português, de forma relativa.

**Architecture:** A API acrescenta `created_at` ao contrato público, usando o timestamp existente de `PhotoScan`. O Nuxt recebe o ISO tipado, formata-o em um helper puro e renderiza a menção apenas no `EncarteCard`.

**Tech Stack:** Django/Ninja + pytest; Nuxt 4, Vue 3, TypeScript e Vitest.

## Global Constraints

- Mostrar a menção somente no card, não no lightbox.
- Usar `PhotoScan.created_at` como fonte.
- Expor `created_at` em ISO-8601 com timezone.
- Exibir “Cadastrado agora” abaixo de 1 minuto.
- Exibir minutos, horas e dias com singular/plural correto.
- A partir de 30 dias, exibir `Cadastrado em dd/mm/aaaa`.
- Não alterar a ordenação do feed.
- Preservar todo WIP alheio na API; adicionar ao índice somente os hunks desta feature.

---

### Task 1: Expor `created_at` na API pública

**Files:**
- Modify: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/schemas.py`
- Modify: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/services/encartes.py`
- Test: `/root/Docker/projetos/dev-snap-api/tests/jbo_public/test_encartes_api.py`

**Interfaces:**
- Consumes: `PhotoScan.created_at: datetime`
- Produces: `JboEncarteSchema.created_at: datetime` e chave `created_at` em `serialize_encarte()`

- [ ] **Step 1: Escrever o teste da resposta pública**

No teste `test_lists_pending_and_approved_ordered_by_ends_desc`, acrescentar:

```python
assert body["items"][0]["created_at"] == newer.created_at.isoformat()
```

- [ ] **Step 2: Confirmar RED**

Run:

```bash
docker exec snap-api-dev pytest \
  tests/jbo_public/test_encartes_api.py::test_lists_pending_and_approved_ordered_by_ends_desc -q
```

Expected: FAIL porque `created_at` não existe no JSON.

- [ ] **Step 3: Implementar o contrato e a serialização**

Em `JboEncarteSchema`:

```python
created_at: datetime
```

Garantir que `datetime` esteja importado de `datetime`.

Em `serialize_encarte()`:

```python
"created_at": scan.created_at,
```

- [ ] **Step 4: Confirmar GREEN na suíte de encartes**

Run:

```bash
docker exec snap-api-dev pytest tests/jbo_public/test_encartes_api.py -q
```

Expected: todos os testes passam.

- [ ] **Step 5: Commit isolado da API**

```bash
cd /root/Docker/projetos/dev-snap-api
git add apps/jbo_public/schemas.py \
  apps/jbo_public/services/encartes.py \
  tests/jbo_public/test_encartes_api.py
git commit -m "feat: expõe data de cadastro dos encartes públicos"
```

---

### Task 2: Formatar e mostrar o tempo de cadastro no card

**Files:**
- Create: `/root/Docker/projetos/dev-joinvilleboasofertas/app/utils/relativeTime.ts`
- Create: `/root/Docker/projetos/dev-joinvilleboasofertas/tests/relativeTime.spec.ts`
- Modify: `/root/Docker/projetos/dev-joinvilleboasofertas/app/utils/jboApi.ts`
- Modify: `/root/Docker/projetos/dev-joinvilleboasofertas/app/components/encartes/EncarteCard.vue`
- Modify: `/root/Docker/projetos/dev-joinvilleboasofertas/tests/encartesPage.spec.ts`

**Interfaces:**
- Consumes: `JboEncarte.created_at: string`
- Produces: `formatRegisteredAt(iso: string, now?: Date): string`

- [ ] **Step 1: Escrever os testes do helper**

Criar `tests/relativeTime.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { formatRegisteredAt } from '../app/utils/relativeTime'

const now = new Date('2026-08-17T13:00:00.000Z')

describe('formatRegisteredAt', () => {
  it.each([
    ['2026-08-17T12:59:31.000Z', 'Cadastrado agora'],
    ['2026-08-17T12:59:00.000Z', 'Cadastrado há 1 minuto'],
    ['2026-08-17T12:55:00.000Z', 'Cadastrado há 5 minutos'],
    ['2026-08-17T12:00:00.000Z', 'Cadastrado há 1 hora'],
    ['2026-08-17T08:00:00.000Z', 'Cadastrado há 5 horas'],
    ['2026-08-16T13:00:00.000Z', 'Cadastrado há 1 dia'],
    ['2026-08-15T13:00:00.000Z', 'Cadastrado há 2 dias'],
    ['2026-07-18T13:00:00.000Z', 'Cadastrado em 18/07/2026'],
  ])('formata %s', (iso, expected) => {
    expect(formatRegisteredAt(iso, now)).toBe(expected)
  })
})
```

- [ ] **Step 2: Escrever a guarda de integração do card**

Em `tests/encartesPage.spec.ts`, acrescentar um teste que verifica:

```typescript
it('mostra quando cada encarte foi cadastrado', () => {
  const card = source('app/components/encartes/EncarteCard.vue')
  const api = source('app/utils/jboApi.ts')

  expect(card).toContain('formatRegisteredAt(encarte.created_at)')
  expect(card).toContain('class="card__registered"')
  expect(api).toMatch(/created_at:\s*string/)
})
```

- [ ] **Step 3: Confirmar RED**

Run:

```bash
npm test -- --run tests/relativeTime.spec.ts tests/encartesPage.spec.ts
```

Expected: FAIL porque o helper e o campo ainda não existem.

- [ ] **Step 4: Implementar o helper puro**

Criar `app/utils/relativeTime.ts`:

```typescript
const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

function unit(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`
}

export function formatRegisteredAt(iso: string, now = new Date()): string {
  const createdAt = new Date(iso)
  const elapsed = Math.max(0, now.getTime() - createdAt.getTime())

  if (elapsed < MINUTE_MS) return 'Cadastrado agora'
  if (elapsed < HOUR_MS) {
    return `Cadastrado há ${unit(Math.floor(elapsed / MINUTE_MS), 'minuto', 'minutos')}`
  }
  if (elapsed < DAY_MS) {
    return `Cadastrado há ${unit(Math.floor(elapsed / HOUR_MS), 'hora', 'horas')}`
  }

  const days = Math.floor(elapsed / DAY_MS)
  if (days < 30) return `Cadastrado há ${unit(days, 'dia', 'dias')}`

  return `Cadastrado em ${new Intl.DateTimeFormat('pt-BR').format(createdAt)}`
}
```

- [ ] **Step 5: Integrar tipo e card**

Em `JboEncarte`:

```typescript
created_at: string
```

Em `EncarteCard.vue`, importar o helper e renderizar abaixo da validade:

```vue
<span class="card__registered">
  {{ formatRegisteredAt(encarte.created_at) }}
</span>
```

Usar em `.card__registered` a mesma cor e tamanho secundários de `.card__dates`.

- [ ] **Step 6: Confirmar GREEN e build**

Run:

```bash
npm test -- --run
npm run build
```

Expected: suíte e build passam.

- [ ] **Step 7: Commit isolado do frontend**

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas
git add app/utils/relativeTime.ts \
  app/utils/jboApi.ts \
  app/components/encartes/EncarteCard.vue \
  tests/relativeTime.spec.ts \
  tests/encartesPage.spec.ts
git commit -m "feat: mostra tempo de cadastro nos encartes"
```

---

### Task 3: Verificação integrada

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: API `created_at` e frontend `JboEncarte.created_at`
- Produces: evidência de funcionamento público

- [ ] **Step 1: Recriar os serviços a partir dos HEADs commitados**

Reiniciar a API, cujo container usa bind mount do checkout:

```bash
docker restart snap-api-dev
```

Reconstruir o Nuxt em um archive limpo para não incluir mudanças não commitadas:

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas
FRONT_ARCHIVE=$(mktemp -d /tmp/jbo-created-at.XXXXXX)
git archive HEAD | tar -x -C "$FRONT_ARCHIVE"
docker build -t dev-joinvilleboasofertas-app "$FRONT_ARCHIVE"
docker compose up -d --no-build --force-recreate app
rm -rf "$FRONT_ARCHIVE"
```

- [ ] **Step 2: Smoke do JSON**

Run:

```bash
python3 - <<'PY'
import json
import urllib.request
from datetime import datetime

url = "https://joinvilleboasofertas-loc-app.cacin.dev/api/public/jbo/encartes?limit=1"
with urllib.request.urlopen(url, timeout=25) as response:
    body = json.load(response)

item = body["items"][0]
datetime.fromisoformat(item["created_at"])
assert "dataset_status" not in item
assert "status" not in item
print(item["created_at"])
PY
```

- [ ] **Step 3: Smoke da página**

Run:

```bash
python3 - <<'PY'
import urllib.request

url = "https://joinvilleboasofertas-loc-app.cacin.dev/encartes"
with urllib.request.urlopen(url, timeout=25) as response:
    html = response.read().decode()

assert response.status == 200
assert "Cadastrado" in html
print("encartes:", response.status)
PY
```

