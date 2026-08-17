# Miniatura inteira dos encartes públicos — Design

**Data:** 2026-08-17  
**Status:** Aprovado em conversa; aguardando revisão do arquivo  
**Base:** `docs/superpowers/specs/2026-08-16-encartes-publicos-design.md`

## Objetivo

Mostrar no card uma **miniatura completa** do encarte (sem recorte), em quadro fixo 3:4. O clique continua abrindo o lightbox com a imagem ampliada (`xl`).

## Problema

O feed usa o preset `md` (240×240, `fit=cover`), que **corta** a imagem no servidor. O CSS do card já usa `object-fit: contain`, mas recebe um arquivo já recortado.

## Decisões

| Tema | Decisão |
|------|--------|
| Card | Quadro fixo 3:4; imagem inteira; margens brancas se a proporção não for 3:4 |
| Thumb | Novo preset `encarte`: 480×640, `fit=contain`, quality 82 |
| Feed | `image_url` ← preset `encarte` |
| Lightbox | `image_url_xl` ← `xl` (`contain`), UI inalterada |
| Cache | Geração sob demanda no 1º acesso (fluxo existente); sem backfill em massa |
| Presets existentes | Não alterar `md` / `card` / `lg` / etc. usados em outras telas |

## API

Em `services/images/presets.py`:

```python
"encarte": ImagePreset(width=480, height=640, fit="contain", quality=82),
```

Em `serialize_encarte`:

```python
urls = image_to_url_dict(scan.image, presets=("encarte", "xl"))["urls"]
# image_url <- urls["encarte"]
# image_url_xl <- urls["xl"]
```

## UI

- Manter `.card__media` com `aspect-ratio: 3 / 4` e fundo branco.
- Manter `.card__img` com `object-fit: contain`.
- Lightbox sem mudança de comportamento.

## Fora de escopo

- Mudar proporção do card para altura livre
- Regenerar cache de todos os presets antigos
- Alterar presets globais usados por ofertas, home ou admin

## Critérios de sucesso

1. Thumb do feed não corta o encarte (proporção original preservada dentro do quadro 3:4).
2. Preset `encarte` existe em `PRESETS` com 480×640 `contain`.
3. JSON público: `image_url` aponta para `/api/img/encarte/...`; `image_url_xl` continua `xl`.
4. Lightbox abre a imagem ampliada inteira.
5. Testes de presets e de serialização/feed cobrem o novo preset.

## Repos

| Repo | Papel |
|------|--------|
| `dev-snap-api` | Preset + serialize + testes |
| `dev-joinvilleboasofertas` | Spec; CSS só se precisar reforçar `contain` |
