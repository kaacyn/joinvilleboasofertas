# Perguntas frequentes (FAQ) — Design

**Data:** 2026-08-24  
**Status:** Aprovado em conversa (conteúdo inicial; ajustes de copy depois)

## Objetivo

Página pública de perguntas frequentes para **quem compra** e para **lojas / comerciantes**, em linguagem simples, sem detalhes técnicos ou administrativos.

## Decisões

| Tema | Decisão |
|------|--------|
| Rota | `/perguntas-frequentes` |
| Título | Perguntas frequentes |
| Menu | Item **Perguntas frequentes** (junto a Termos / Privacidade) |
| Organização | Duas seções: **Para quem compra** e **Para lojas / comerciantes** |
| UI | Accordion (abre ao clicar na pergunta) |
| Conteúdo | Estático no Vue (rascunho inicial; copy pode ser ajustada depois) |
| Contato | Instagram `@joinvilleboasofertas` |
| Backend / CMS | Fora de escopo |

## Página

- Layout alinhado a `/termos` e `/privacidade` (`AppHeader` + `main` ~720px).
- Accordion nativo (`<details>`/`<summary>`) ou equivalente acessível, sem dependência extra.
- Link para `/envie-um-encarte` na seção de lojas.
- SEO: title/description próprios.

## Conteúdo inicial

### Para quem compra

1. **O que é o Joinville Boas Ofertas?**  
   Um catálogo público de ofertas de lojas de Joinville e região. Você compara preços e vê trechos de encartes — sem comprar pelo site.

2. **Os preços estão sempre certos?**  
   Fazemos o possível para refletir o que está no encarte, mas preço e estoque podem mudar. Confira sempre na loja antes de comprar.

3. **Por que algumas ofertas aparecem como expiradas?**  
   A validade do encarte já passou. Elas podem continuar visíveis só para consulta, não como promoção vigente.

4. **O que significa o selo de clube / preço de fidelidade?**  
   Em geral é o preço para quem participa do programa da loja. As condições exatas estão no encarte da loja.

5. **Como encontro encartes completos?**  
   Na página de Encartes ou, em cada oferta, use “Ver encarte completo” quando disponível. Vale conferir todas as condições no encarte.

6. **Posso receber avisos de uma loja?**  
   Em algumas lojas você pode ativar avisos de ofertas e encartes no navegador. O pedido de permissão aparece quando você escolhe acompanhar a loja.

7. **O site vende ou entrega produtos?**  
   Não. Só mostramos informações. A compra é feita diretamente na loja.

### Para lojas / comerciantes

8. **Como minha loja pode aparecer no Joinville Boas Ofertas?**  
   Em geral acompanhamos o Instagram da loja para localizar encartes públicos. Use a página Envie um encarte (`/envie-um-encarte`) para cadastrar o Instagram ou deixar o pedido na fila.

9. **Quais regras para o encarte ser divulgado no Instagram do Joinville Boas Ofertas?**  
   O material precisa ser um encarte ou anúncio público da loja, com preço e validade legíveis, de Joinville ou região. Não publicamos conteúdo ofensivo, enganoso ou que não seja da própria loja.

10. **Preciso pagar para aparecer?**  
    Não há cobrança para a loja aparecer no catálogo público neste momento.

11. **Minha loja não tem Instagram. E agora?**  
    Deixe o Instagram em branco no formulário. O envio nativo de encartes pela plataforma está em desenvolvimento; o pedido fica na fila.

12. **Posso pedir para corrigir ou remover uma oferta?**  
    Sim. Fale conosco no Instagram @joinvilleboasofertas com o nome da loja e o que precisa ajustar.

13. **Vocês alteram os preços do meu encarte?**  
    Não. Exibimos o que está no material público da loja. Se houver erro de leitura, avise pelo Instagram para corrigirmos.

## Fora de escopo

- CMS, API ou painel para editar FAQ
- Busca dentro da FAQ
- Detalhes técnicos, de infra ou de operação interna
- Ambiente de produção (deploy loc quando solicitado)

## Critérios de aceite

1. Menu leva a `/perguntas-frequentes`.
2. Duas seções com os itens acima (ou copy revisada equivalente).
3. Cada pergunta abre/fecha em accordion.
4. Sem jargão técnico/admin nas respostas.
5. Link útil para `/envie-um-encarte` na seção de lojas.
