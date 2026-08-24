# Envie um encarte (lead Instagram) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página pública `/envie-um-encarte` com formulário que persiste leads (mercado + solicitante + e-mail + Instagram opcional + papel) via `POST /api/public/jbo/encarte-leads`, com CTAs no menu e em `/encartes`.

**Architecture:** Model `JboEncarteLead` + endpoint Ninja em `apps/jbo_public` (só POST, rate-limited). Nuxt consome com `jboSend('POST', '/encarte-leads', body)`. Sem admin, e-mail ou monitoramento automático.

**Tech Stack:** Django Ninja + pytest (`dev-snap-api`), Nuxt 3 / Vue 3 + Vitest (`dev-joinvilleboasofertas`)

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-24-envie-um-encarte-design.md` (repo Nuxt)
- Rota UI: `/envie-um-encarte`
- Endpoint: `POST /api/public/jbo/encarte-leads` → `201 { id, created_at }`
- Campos obrigatórios: `store_name`, `requester_name`, `requester_email`, `role` (`user`|`merchant`)
- `instagram` opcional; vazio → `null`; normalizar handle quando possível
- Sucesso: formulário some; confirmação na mesma página
- CTAs: menu + intro de `/encartes`, rótulo **Envie um encarte**
- Sem GET/listagem pública, admin, e-mail ou ingestão Instagram
- Auth: público; rate limit writes ~`30/m` por IP (grupo próprio)

## File map

| Arquivo | Responsabilidade |
|---------|------------------|
| `dev-snap-api/apps/jbo_public/models.py` | Model `JboEncarteLead` |
| `dev-snap-api/apps/jbo_public/migrations/0003_jbo_encarte_lead.py` | Migration |
| `dev-snap-api/apps/jbo_public/services/encarte_leads.py` | Normalização Instagram + create |
| `dev-snap-api/apps/jbo_public/schemas.py` | In/Out schemas |
| `dev-snap-api/apps/jbo_public/api.py` | Rota POST |
| `dev-snap-api/tests/jbo_public/test_encarte_leads_api.py` | Testes API |
| `dev-joinvilleboasofertas/app/pages/envie-um-encarte.vue` | Página + form |
| `dev-joinvilleboasofertas/app/components/HeaderMenu.vue` | Link do menu |
| `dev-joinvilleboasofertas/app/pages/encartes.vue` | CTA no intro |
| `dev-joinvilleboasofertas/tests/envieEncartePage.spec.ts` | Contratos da página |
| `dev-joinvilleboasofertas/tests/navigationIntegration.spec.ts` | Link no menu |
| `dev-joinvilleboasofertas/tests/encartesPage.spec.ts` | CTA em encartes |
| `dev-joinvilleboasofertas/README.md` | Rota na tabela |

---

### Task 1: API `JboEncarteLead` + `POST /encarte-leads`

**Repo:** `/root/Docker/projetos/dev-snap-api`

**Files:**
- Modify: `apps/jbo_public/models.py`
- Create: `apps/jbo_public/migrations/0003_jbo_encarte_lead.py` (via `makemigrations`)
- Create: `apps/jbo_public/services/encarte_leads.py`
- Modify: `apps/jbo_public/schemas.py`
- Modify: `apps/jbo_public/api.py`
- Create: `tests/jbo_public/test_encarte_leads_api.py`

**Interfaces:**
- Produz:
  - `normalize_instagram(raw: str | None) -> str | None`
  - `create_encarte_lead(*, store_name, requester_name, requester_email, instagram, role) -> JboEncarteLead`
  - `POST /api/public/jbo/encarte-leads` body: `JboEncarteLeadInSchema` → `201` `JboEncarteLeadOutSchema` (`id: UUID`, `created_at: datetime`)
  - `role` ∈ `{user, merchant}`; Instagram normalizado (ex. `https://instagram.com/bistek` → `bistek`, `@bistek` → `bistek`)

- [ ] **Step 1: Write the failing tests**

Create `tests/jbo_public/test_encarte_leads_api.py`:

```python
"""POST público de leads Envie um encarte."""
import json

import pytest
from django.test import Client

from apps.jbo_public.models import JboEncarteLead
from apps.jbo_public.services.encarte_leads import normalize_instagram

pytestmark = pytest.mark.django_db


def _post(client: Client, body: dict):
    return client.post(
        "/api/public/jbo/encarte-leads",
        data=json.dumps(body),
        content_type="application/json",
    )


def test_normalize_instagram_handle_and_url():
    assert normalize_instagram("@Bistek") == "bistek"
    assert normalize_instagram("https://www.instagram.com/bistek/") == "bistek"
    assert normalize_instagram("  ") is None
    assert normalize_instagram(None) is None


def test_create_lead_success():
    client = Client()
    response = _post(
        client,
        {
            "store_name": "  Bistek  ",
            "requester_name": "Maria",
            "requester_email": "maria@exemplo.com",
            "instagram": "@bistek",
            "role": "merchant",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert "id" in data and "created_at" in data
    lead = JboEncarteLead.objects.get(pk=data["id"])
    assert lead.store_name == "Bistek"
    assert lead.instagram == "bistek"
    assert lead.role == "merchant"
    assert lead.requester_email == "maria@exemplo.com"


def test_create_lead_without_instagram():
    client = Client()
    response = _post(
        client,
        {
            "store_name": "Mercado X",
            "requester_name": "João",
            "requester_email": "joao@exemplo.com",
            "instagram": "",
            "role": "user",
        },
    )
    assert response.status_code == 201
    lead = JboEncarteLead.objects.get(pk=response.json()["id"])
    assert lead.instagram is None or lead.instagram == ""


def test_create_lead_rejects_missing_required():
    client = Client()
    response = _post(
        client,
        {
            "store_name": "",
            "requester_name": "Maria",
            "requester_email": "maria@exemplo.com",
            "role": "user",
        },
    )
    assert response.status_code in (400, 422)


def test_create_lead_rejects_invalid_role():
    client = Client()
    response = _post(
        client,
        {
            "store_name": "Mercado",
            "requester_name": "Maria",
            "requester_email": "maria@exemplo.com",
            "role": "admin",
        },
    )
    assert response.status_code in (400, 422)
```

- [ ] **Step 2: Run tests to verify they fail**

Run (no repo snap-api):

```bash
cd /root/Docker/projetos/dev-snap-api
pytest tests/jbo_public/test_encarte_leads_api.py -v
```

Expected: FAIL (import/model/rota ausentes).

- [ ] **Step 3: Implement model**

Append to `apps/jbo_public/models.py`:

```python
class JboEncarteLead(models.Model):
    ROLE_USER = "user"
    ROLE_MERCHANT = "merchant"
    ROLE_CHOICES = [
        (ROLE_USER, "Usuário"),
        (ROLE_MERCHANT, "Comerciante"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store_name = models.CharField(max_length=200)
    requester_name = models.CharField(max_length=200)
    requester_email = models.EmailField()
    instagram = models.CharField(max_length=100, null=True, blank=True)
    role = models.CharField(max_length=16, choices=ROLE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"JboEncarteLead({self.store_name}, {self.role})"
```

- [ ] **Step 4: Create migration**

```bash
cd /root/Docker/projetos/dev-snap-api
python manage.py makemigrations jbo_public --name jbo_encarte_lead
```

- [ ] **Step 5: Implement service**

Create `apps/jbo_public/services/encarte_leads.py`:

```python
"""Persistência de leads Envie um encarte."""
from __future__ import annotations

import re
from urllib.parse import urlparse

from django.core.exceptions import ValidationError

from apps.jbo_public.models import JboEncarteLead

_HANDLE_RE = re.compile(r"^[A-Za-z0-9._]{1,30}$")


def normalize_instagram(raw: str | None) -> str | None:
    if raw is None:
        return None
    text = raw.strip()
    if not text:
        return None
    if "instagram.com" in text.lower():
        path = urlparse(text if "://" in text else f"https://{text}").path.strip("/")
        text = path.split("/")[0] if path else ""
    text = text.lstrip("@").strip().rstrip("/")
    if not text:
        return None
    return text.lower()


def create_encarte_lead(
    *,
    store_name: str,
    requester_name: str,
    requester_email: str,
    instagram: str | None,
    role: str,
) -> JboEncarteLead:
    store = (store_name or "").strip()
    name = (requester_name or "").strip()
    email = (requester_email or "").strip()
    if not store or not name or not email:
        raise ValidationError("Campos obrigatórios ausentes.")
    if role not in (JboEncarteLead.ROLE_USER, JboEncarteLead.ROLE_MERCHANT):
        raise ValidationError("Papel inválido.")
    handle = normalize_instagram(instagram)
    if handle is not None and not _HANDLE_RE.match(handle):
        raise ValidationError("Instagram inválido.")
    return JboEncarteLead.objects.create(
        store_name=store,
        requester_name=name,
        requester_email=email,
        instagram=handle,
        role=role,
    )
```

- [ ] **Step 6: Schemas + API route**

Append to `apps/jbo_public/schemas.py`:

```python
from typing import Literal  # se ainda não importado; senão usar Enum/str

class JboEncarteLeadInSchema(Schema):
    store_name: str
    requester_name: str
    requester_email: str
    instagram: Optional[str] = None
    role: str  # validar no service: user|merchant


class JboEncarteLeadOutSchema(Schema):
    id: UUID
    created_at: datetime
```

In `apps/jbo_public/api.py`, import schemas + `create_encarte_lead`, and add:

```python
@router.post("/encarte-leads", response={201: JboEncarteLeadOutSchema})
@ratelimit(key="ip", rate="30/m", block=True, group="jbo_encarte_leads")
def create_encarte_lead_endpoint(request, payload: JboEncarteLeadInSchema):
    """Recebe pedido de monitoramento de Instagram / fila de encarte."""
    from django.core.exceptions import ValidationError
    from ninja.errors import HttpError

    try:
        lead = create_encarte_lead(
            store_name=payload.store_name,
            requester_name=payload.requester_name,
            requester_email=payload.requester_email,
            instagram=payload.instagram,
            role=payload.role,
        )
    except ValidationError as exc:
        raise HttpError(422, "; ".join(exc.messages) if hasattr(exc, "messages") else str(exc))
    return 201, {"id": lead.id, "created_at": lead.created_at}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd /root/Docker/projetos/dev-snap-api
pytest tests/jbo_public/test_encarte_leads_api.py -v
```

Expected: PASS. Se e-mail vazio/`store_name` vazio for aceito pelo Ninja sem `ValidationError`, ajuste o endpoint para rejeitar string em branco **antes** do create (trim + check) — os testes exigem `400` ou `422`.

- [ ] **Step 8: Commit (snap-api)**

```bash
cd /root/Docker/projetos/dev-snap-api
git add apps/jbo_public/models.py \
  apps/jbo_public/migrations/0003_jbo_encarte_lead.py \
  apps/jbo_public/services/encarte_leads.py \
  apps/jbo_public/schemas.py \
  apps/jbo_public/api.py \
  tests/jbo_public/test_encarte_leads_api.py
git commit -m "$(cat <<'EOF'
feat(jbo): POST encarte-leads para fila Envie um encarte

EOF
)"
```

---

### Task 2: Página Nuxt `/envie-um-encarte`

**Repo:** `/root/Docker/projetos/dev-joinvilleboasofertas`

**Files:**
- Create: `app/pages/envie-um-encarte.vue`
- Create: `tests/envieEncartePage.spec.ts`
- Modify: `README.md` (linha na tabela de rotas)

**Interfaces:**
- Consome: `jboSend('POST', '/encarte-leads', body)` de `app/utils/jboApi.ts`
- Body: `{ store_name, requester_name, requester_email, instagram: string | null, role: 'user' | 'merchant' }`
- Produz: página com copy informativa + form + estado de sucesso

- [ ] **Step 1: Write the failing page contract test**

Create `tests/envieEncartePage.spec.ts`:

```typescript
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('página Envie um encarte', () => {
  it('explica Instagram e tem campos obrigatórios + submit via jboSend', () => {
    const page = source('app/pages/envie-um-encarte.vue')
    expect(page).toContain('Instagram')
    expect(page).toMatch(/em desenvolvimento|sendo desenvolvido/i)
    expect(page).toContain('Nome do mercado')
    expect(page).toContain('Nome do solicitante')
    expect(page).toContain('E-mail')
    expect(page).toContain('Usuário')
    expect(page).toContain('Comerciante')
    expect(page).toContain("jboSend('POST', '/encarte-leads'")
    expect(page).toContain('Recebemos seu pedido')
    expect(page).toContain('value="user"')
    expect(page).toContain('value="merchant"')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas
npx vitest run tests/envieEncartePage.spec.ts
```

Expected: FAIL (arquivo da página ausente).

- [ ] **Step 3: Implement the page**

Create `app/pages/envie-um-encarte.vue` (estrutura mínima — estilos no padrão `lojas.vue` / tokens):

```vue
<template>
  <div class="page">
    <AppHeader />
    <main class="page__main">
      <header class="page__intro">
        <h1>Envie um encarte</h1>
        <p>
          Buscamos informações de encartes no Instagram do mercado.
          Se o mercado não tiver Instagram, deixe o campo em branco —
          o envio nativo de encartes pela plataforma está em desenvolvimento
          e o pedido fica na fila aguardando essa evolução.
        </p>
      </header>

      <p v-if="done" class="success" role="status">
        Recebemos seu pedido. Entraremos em contato se precisarmos de mais informações.
      </p>

      <form v-else class="form" @submit.prevent="onSubmit">
        <label class="field">
          <span>Nome do mercado *</span>
          <input v-model="storeName" type="text" required maxlength="200" autocomplete="organization">
        </label>
        <label class="field">
          <span>Nome do solicitante *</span>
          <input v-model="requesterName" type="text" required maxlength="200" autocomplete="name">
        </label>
        <label class="field">
          <span>E-mail do solicitante *</span>
          <input v-model="requesterEmail" type="email" required maxlength="254" autocomplete="email">
        </label>
        <label class="field">
          <span>Instagram do mercado</span>
          <input v-model="instagram" type="text" maxlength="100" placeholder="@mercado (opcional)" autocomplete="off">
        </label>
        <fieldset class="field field--role">
          <legend>Sou *</legend>
          <label><input v-model="role" type="radio" value="user" required> Usuário</label>
          <label><input v-model="role" type="radio" value="merchant"> Comerciante</label>
        </fieldset>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <button type="submit" class="submit" :disabled="sending">
          {{ sending ? 'Enviando…' : 'Enviar' }}
        </button>
      </form>
    </main>
  </div>
</template>

<script setup lang="ts">
import { jboSend } from '~/utils/jboApi'

useSeoMeta({
  title: 'Envie um encarte | Joinville Boas Ofertas',
  description: 'Cadastre o Instagram do mercado para monitoramento de encartes.',
})

const storeName = ref('')
const requesterName = ref('')
const requesterEmail = ref('')
const instagram = ref('')
const role = ref<'user' | 'merchant' | ''>('')
const sending = ref(false)
const done = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  if (!role.value) {
    error.value = 'Selecione se você é usuário ou comerciante.'
    return
  }
  sending.value = true
  try {
    await jboSend('POST', '/encarte-leads', {
      store_name: storeName.value.trim(),
      requester_name: requesterName.value.trim(),
      requester_email: requesterEmail.value.trim(),
      instagram: instagram.value.trim() || null,
      role: role.value,
    })
    done.value = true
  } catch {
    error.value = 'Não foi possível enviar. Tente novamente em instantes.'
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.page__main {
  max-width: 720px;
  margin: 0 auto;
  padding: 1rem 1rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.page__intro h1 {
  margin: 0 0 0.4rem;
  font-size: 1.45rem;
  font-weight: 900;
}
.page__intro p {
  margin: 0;
  color: var(--muted);
  font-size: 0.92rem;
  line-height: 1.45;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.88rem;
}
.field input[type='text'],
.field input[type='email'] {
  border: 1px solid var(--border);
  background: var(--navy-light);
  border-radius: 10px;
  padding: 0.65rem 0.85rem;
  color: inherit;
  font: inherit;
}
.field input:focus {
  outline: 2px solid var(--yellow);
}
.field--role {
  border: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.field--role label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.submit {
  align-self: flex-start;
  min-width: 160px;
  border: 1px solid var(--yellow);
  border-radius: 12px;
  padding: 0.7rem 1rem;
  background: var(--yellow);
  color: var(--navy);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}
.submit:disabled {
  opacity: 0.7;
  cursor: wait;
}
.error {
  margin: 0;
  color: #ffb2b5;
  font-size: 0.85rem;
}
.success {
  margin: 0;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--navy-light);
  font-size: 0.95rem;
  line-height: 1.4;
}
</style>
```

- [ ] **Step 4: Update README routes table**

Add row: `| \`/envie-um-encarte\` | Formulário Envie um encarte (lead Instagram) |`

- [ ] **Step 5: Run tests**

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas
npx vitest run tests/envieEncartePage.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit (Nuxt)**

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas
git add app/pages/envie-um-encarte.vue tests/envieEncartePage.spec.ts README.md
git commit -m "$(cat <<'EOF'
feat: página Envie um encarte com formulário de lead

EOF
)"
```

---

### Task 3: CTAs no menu e em `/encartes`

**Repo:** `/root/Docker/projetos/dev-joinvilleboasofertas`

**Files:**
- Modify: `app/components/HeaderMenu.vue`
- Modify: `app/pages/encartes.vue` (intro)
- Modify: `tests/navigationIntegration.spec.ts`
- Modify: `tests/encartesPage.spec.ts`

**Interfaces:**
- Consome: rota `/envie-um-encarte` da Task 2
- Produz: link menu + botão CTA rótulo **Envie um encarte**

- [ ] **Step 1: Extend failing expectations in existing tests**

In `tests/navigationIntegration.spec.ts`, inside the HeaderMenu test, add:

```typescript
expect(headerMenu).toContain('to="/envie-um-encarte"')
expect(headerMenu).toContain('Envie um encarte')
```

In `tests/encartesPage.spec.ts`, add an assertion (novo `it` ou no intro existente):

```typescript
it('expõe CTA Envie um encarte', () => {
  const page = source('app/pages/encartes.vue')
  expect(page).toContain('to="/envie-um-encarte"')
  expect(page).toContain('Envie um encarte')
})
```

(Ajuste `source` se o arquivo já tiver helper próprio.)

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas
npx vitest run tests/navigationIntegration.spec.ts tests/encartesPage.spec.ts
```

Expected: FAIL nas novas asserts.

- [ ] **Step 3: Add menu link**

In `HeaderMenu.vue`, after the Encartes `NuxtLink`, insert:

```vue
      <NuxtLink
        to="/envie-um-encarte"
        class="hmenu__item"
        role="menuitem"
        @click="close"
      >
        Envie um encarte
      </NuxtLink>
```

- [ ] **Step 4: Add CTA on encartes intro**

In `encartes.vue` intro header, after the `<p>`, add:

```vue
        <NuxtLink to="/envie-um-encarte" class="intro-cta">
          Envie um encarte
        </NuxtLink>
```

Scoped CSS (alinhado ao botão `.more` da página):

```css
.intro-cta {
  display: inline-flex;
  margin-top: 0.65rem;
  padding: 0.55rem 0.9rem;
  border-radius: 10px;
  background: var(--yellow);
  color: var(--navy);
  font-weight: 800;
  font-size: 0.88rem;
  text-decoration: none;
}
```

- [ ] **Step 5: Run tests**

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas
npx vitest run tests/navigationIntegration.spec.ts tests/encartesPage.spec.ts tests/envieEncartePage.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas
git add app/components/HeaderMenu.vue app/pages/encartes.vue \
  tests/navigationIntegration.spec.ts tests/encartesPage.spec.ts
git commit -m "$(cat <<'EOF'
feat: CTAs Envie um encarte no menu e na lista de encartes

EOF
)"
```

---

### Task 4: Migrate + smoke no loc (opcional se containers rodando)

**Repos:** `dev-snap-api` + `dev-joinvilleboasofertas`

- [ ] **Step 1: Apply migration on snap-api-dev**

```bash
cd /root/Docker/projetos/dev-snap-api
docker compose exec -T api python manage.py migrate jbo_public
```

(Ajuste o nome do serviço se não for `api` — use o container `snap-api-dev`.)

- [ ] **Step 2: Rebuild JBO loc**

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas
docker compose up -d --build
```

- [ ] **Step 3: Smoke curl**

```bash
curl -sS -X POST 'https://joinvilleboasofertas-loc-app.cacin.dev/api/public/jbo/encarte-leads' \
  -H 'Content-Type: application/json' \
  -d '{"store_name":"Smoke","requester_name":"Teste","requester_email":"t@exemplo.com","instagram":"","role":"user"}'
```

Expected: JSON com `id` e `created_at` (HTTP 201).

- [ ] **Step 4: No commit** (só verificação operacional; commits já feitos nas Tasks 1–3)

---

## Spec coverage (self-review)

| Spec | Task |
|------|------|
| Persistência snap-api POST | 1 |
| Campos + role radio + Instagram opcional | 1 + 2 |
| Copy Instagram / nativo em desenvolvimento | 2 |
| Sucesso mesma página | 2 |
| Menu + CTA encartes | 3 |
| Sem admin/e-mail/monitoramento | todas (não implementam) |
| Testes front + API | 1–3 |
| Deploy loc | 4 |

Placeholders: nenhum. Nomes estáveis: `JboEncarteLead`, `/encarte-leads`, `role` `user`|`merchant`, rota `/envie-um-encarte`.
