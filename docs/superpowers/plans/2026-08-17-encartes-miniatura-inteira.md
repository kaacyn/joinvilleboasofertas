# Miniatura inteira dos encartes públicos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Servir uma miniatura 480×640 otimizada e sem recorte nos cards de encarte, mantendo `xl` no lightbox.

**Architecture:** Registrar um preset canônico `encarte` com `fit="contain"` no pipeline de imagens. O serializer público passa a pedir `("encarte", "xl")`, sem mudar o contrato JSON nem o frontend, cujo quadro 3:4 já usa `object-fit: contain`.

**Tech Stack:** Django, Pillow, pytest; Nuxt/Vue existente sem mudança de código.

## Global Constraints

- Preset `encarte`: largura 480, altura 640, `fit="contain"`, qualidade 82.
- `image_url` do feed usa `encarte`; `image_url_xl` continua usando `xl`.
- O card permanece em quadro fixo 3:4, fundo branco e `object-fit: contain`.
- Não alterar `md`, `card`, `lg`, `hd`, `xl`, `xxl` ou seus consumidores.
- Variantes são geradas sob demanda; não executar backfill.
- Preservar todo WIP alheio da API e adicionar ao índice somente os hunks desta feature.

---

### Task 1: Preset e serialização sem recorte

**Files:**
- Modify: `/root/Docker/projetos/dev-snap-api/services/images/presets.py`
- Modify: `/root/Docker/projetos/dev-snap-api/apps/jbo_public/services/encartes.py`
- Test: `/root/Docker/projetos/dev-snap-api/tests/test_image_presets.py`
- Test: `/root/Docker/projetos/dev-snap-api/tests/test_image_transforms.py`
- Test: `/root/Docker/projetos/dev-snap-api/tests/jbo_public/test_encartes_api.py`

**Interfaces:**
- Produces: `PRESETS["encarte"] == ImagePreset(480, 640, "contain", 82)`
- Produces: `JboEncarte.image_url` assinada no slot `encarte`
- Preserves: `JboEncarte.image_url_xl` assinada no slot `xl`

- [ ] **Step 1: Escrever os testes do preset**

Atualizar a lista exata de chaves em `tests/test_image_presets.py`:

```python
assert set(PRESETS.keys()) == {
    "sm", "md", "card", "lg", "hd", "encarte", "xl", "xxl"
}
```

Adicionar:

```python
def test_preset_encarte_is_portrait_contain_thumbnail():
    preset = PRESETS["encarte"]
    assert preset.width == 480
    assert preset.height == 640
    assert preset.fit == "contain"
    assert preset.quality == 82
```

- [ ] **Step 2: Escrever o teste de transformação sem recorte**

Em `tests/test_image_transforms.py`:

```python
def test_generate_variant_encarte_preserves_tall_aspect_without_crop():
    out = generate_variant(_jpg_bytes(width=1000, height=2000), "encarte")
    img = _open_webp(out)
    assert img.size == (320, 640)
```

Esse resultado prova que uma origem 1:2 não é forçada/cortada para 3:4.

- [ ] **Step 3: Escrever o teste do contrato público**

No teste `test_lists_pending_and_approved_ordered_by_ends_desc`:

```python
assert "/api/img/encarte/" in body["items"][0]["image_url"]
assert "/api/img/xl/" in body["items"][0]["image_url_xl"]
```

- [ ] **Step 4: Confirmar RED**

Run:

```bash
docker exec snap-api-dev pytest \
  tests/test_image_presets.py \
  tests/test_image_transforms.py \
  tests/jbo_public/test_encartes_api.py::test_lists_pending_and_approved_ordered_by_ends_desc \
  -q
```

Expected: falhas por ausência de `PRESETS["encarte"]` e por `image_url` ainda usar `md`.

- [ ] **Step 5: Implementar o preset**

Em `services/images/presets.py`, entre `hd` e `xl`:

```python
# encarte: thumbnail vertical do feed público; contain evita cortar a peça.
"encarte": ImagePreset(width=480, height=640, fit="contain", quality=82),
```

- [ ] **Step 6: Trocar somente o thumb do serializer**

Em `serialize_encarte()`:

```python
urls = image_to_url_dict(scan.image, presets=("encarte", "xl"))["urls"]
```

E no payload:

```python
"image_url": urls.get("encarte"),
"image_url_xl": urls.get("xl"),
```

- [ ] **Step 7: Confirmar GREEN**

Run:

```bash
docker exec snap-api-dev pytest \
  tests/test_image_presets.py \
  tests/test_image_transforms.py \
  tests/jbo_public/test_encartes_api.py \
  -q
```

Expected: todos os testes passam.

- [ ] **Step 8: Commit isolado**

```bash
cd /root/Docker/projetos/dev-snap-api
git add services/images/presets.py \
  apps/jbo_public/services/encartes.py \
  tests/test_image_presets.py \
  tests/test_image_transforms.py \
  tests/jbo_public/test_encartes_api.py
git commit -m "fix: preserva imagem inteira nas miniaturas de encarte"
```

---

### Task 2: Publicação e smoke

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: API pública com slot `encarte`
- Produces: evidência HTTP da miniatura e do lightbox

- [ ] **Step 1: Reiniciar a API**

```bash
docker restart snap-api-dev
```

- [ ] **Step 2: Validar o JSON público**

```bash
python3 - <<'PY'
import json
import urllib.request

url = "https://joinvilleboasofertas-loc-app.cacin.dev/api/public/jbo/encartes?limit=1"
request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(request, timeout=25) as response:
    item = json.load(response)["items"][0]

assert "/api/img/encarte/" in item["image_url"]
assert "/api/img/xl/" in item["image_url_xl"]
print(item["image_url"])
print(item["image_url_xl"])
PY
```

- [ ] **Step 3: Validar dimensões e proporção dos bytes do thumb**

Baixar `image_url` pelo domínio público e abrir com Pillow:

```bash
python3 - <<'PY'
import io
import json
import urllib.parse
import urllib.request
from PIL import Image

base = "https://joinvilleboasofertas-loc-app.cacin.dev"
headers = {"User-Agent": "Mozilla/5.0"}
feed = urllib.request.Request(
    base + "/api/public/jbo/encartes?limit=1",
    headers=headers,
)
with urllib.request.urlopen(feed, timeout=25) as response:
    thumb_path = json.load(response)["items"][0]["image_url"]

thumb_url = urllib.parse.urljoin(base, thumb_path)
with urllib.request.urlopen(
    urllib.request.Request(thumb_url, headers=headers),
    timeout=25,
) as response:
    image = Image.open(io.BytesIO(response.read()))

assert image.width <= 480
assert image.height <= 640
assert image.format == "WEBP"
print(image.size)
PY
```

- [ ] **Step 4: Validar página e lightbox**

Run:

```bash
python3 - <<'PY'
import urllib.request

url = "https://joinvilleboasofertas-loc-app.cacin.dev/encartes"
request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(request, timeout=25) as response:
    html = response.read().decode()

assert response.status == 200
assert "/api/img/encarte/" in html
assert "/api/img/xl/" in html
print("encartes:", response.status)
PY
```

O frontend já testado usa `image_url` no card e `image_url_xl || image_url` no lightbox.

