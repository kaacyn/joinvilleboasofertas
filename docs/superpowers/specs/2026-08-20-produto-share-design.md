# Design: Compartilhar página de produto (JBO)

## Problema

A página `/produto/{slug}/[[loja]]` não tem ação de compartilhar; o encarte já tem.

## Decisões

| Decisão | Escolha |
|---|---|
| Posição | Ao lado do `h1` (opção A) |
| Mecânica | Reutilizar `shareEncarte` (folha nativa / copiar link) |
| Ícone | SVG de compartilhar (não “⋯”) |
| URL | URL canônica da página atual (com loja se na rota) |

## UI

- `div.heading` com `h1` + botão `aria-label="Compartilhar oferta"`
- Feedback “Link copiado” (`aria-live`)
- Payload: `title` = nome do produto; `text` = loja se houver; `url` = absolute da página

## Fora de escopo

- Open Graph dedicado além do que a página já tiver
- Menu WhatsApp/etc.
