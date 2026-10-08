# Testes

Testes de ponta a ponta com Playwright. Não há framework: cada arquivo é um
script Node que sobe um servidor estático do próprio repositório, abre o app
num navegador e sai com código 1 se algo falhar.

## Rodar

```bash
npm i -D playwright && npx playwright install chromium   # só na primeira vez
node test/all.mjs            # tudo (uns 25 min, por causa do hscroll)
node test/all.mjs --rapido   # tudo menos o hscroll (uns 5 min)
node test/lesson.mjs 18      # um teste, um capítulo
node test/layout.mjs 11 12   # um teste, vários capítulos
```

Sem argumentos de capítulo, cada teste roda todos os 18. Se o Playwright já
existir no ambiente mas fora do projeto, aponte `PLAYWRIGHT_MODULE` para o
`index.mjs` dele.

## O que cada um cobre

| Arquivo | O que garante |
|---|---|
| `answers.mjs` | Toda resposta declarada como aceita (inclusive cada alternativa de `a: [...]`) passa pelo `check()` do app, e toda múltipla escolha tem a resposta certa entre as opções. Roda dentro do navegador, porque `js/quiz.js` depende de `window`. |
| `lesson.mjs` | Cada parte de cada capítulo é percorrida até o fim respondendo com o gabarito do próprio módulo, e tem de fechar em 100%. Depois joga uma rodada de cada nível de reforço. Qualquer erro de console ou requisição falha reprova. |
| `layout.mjs` | Num celular de 390px a lousa mantém altura constante entre os passos (se oscila, a página pula enquanto o aluno estuda) e nenhuma tabela estoura o invólucro que rola na horizontal. |
| `hscroll.mjs` | A 390px a página nunca rola na horizontal, em nenhum passo de nenhuma parte de nenhum capítulo. É o mais lento, e já pegou uma regressão que nenhum outro pegou. |
| `subpath.mjs` | O app funciona servido num subcaminho, que é como o GitHub Pages o entrega (`/treino_de_italiano/`): intro, home, lição, escopo do service worker e `start_url`/ícones do manifest. |

`lib.mjs` tem as peças comuns: o servidor estático, a resolução do Playwright e
as rotinas que respondem um passo e avançam a lição.

## Problemas conhecidos

O `layout.mjs` mantém uma lista `CONHECIDOS`: problemas já diagnosticados que
ficam registrados em vez de reprovar o conjunto, para que uma falha nova não se
confunda com uma velha. Se um deles parar de acontecer, o teste avisa para tirar
da lista.

Os nove de hoje apareceram na primeira vez que o conjunto rodou nos 18
capítulos, e **todos são dos capítulos 1 a 8** — construídos antes destas
checagens existirem. São os primeiros candidatos a uma revisão.

### A lousa salta entre as regras e os exercícios (caps. 1, 5g, 7c)

No celular, ao passar das regras para os exercícios do livro, a lousa muda de
altura: 914 → 1589px no Capítulo 1, 1953 → 1899px em 5g, 914 → 968px em 7c.

A causa está em `measureBoards` (`js/app.js`), que chama `bookBoard(b, quiet)`
sem o terceiro argumento. O *Promemoria* — a lista com o resumo das regras —
fica vazio na medição, então a altura reservada sai menor que a real. No
Capítulo 1, que tem 18 regras numa parte só, a diferença chega a 675px.

O `.memo` foi feito para encolher e rolar (`flex: 1` + `overflow-y: auto`), mas
isso só funciona quando a lousa tem altura **definida**. No desktop ela ganha
altura da coluna ao lado e o resumo rola; no celular, empilhada, a lousa só tem
`min-height` e o resumo a estica. Por isso não aparece no desktop.

Dois caminhos, nenhum testado: passar `part.rules` na medição — mas aí todas as
lousas de regra do Capítulo 1 ficariam com 1589px numa tela de 844px, o que é
pior —, ou dar altura definida à lousa no celular
(`@media (max-width: 900px) { .lesson-grid > .board { height: var(--board-h) } }`)
para que o resumo volte a rolar. A segunda mexe no layout mobile dos 18
capítulos e pede rodar `layout.mjs` e `hscroll.mjs` inteiros depois.

### Tabelas mais largas que a tela (caps. 5b, 5d, 5e ×3, 8a)

Estouram o invólucro de 9 a 66px. Não quebram nada: o `.table-wrap` rola na
horizontal e a página não acompanha (o `hscroll.mjs` passa). Mas o aluno precisa
arrastar a tabela para ler o fim.

Dos capítulos 9 em diante as tabelas foram remodeladas para caber — menos
colunas, cabeçalhos curtos. Nos primeiros não, porque esta checagem ainda não
existia. O conserto é por tabela, no arquivo de dados do capítulo.

## O que estes testes **não** pegam

Vale saber antes de confiar neles:

- **Resposta errada que seja coerente consigo mesma.** Os testes respondem
  usando o próprio `a` da questão; se o `a` estiver errado em relação ao livro,
  tudo passa em 100%. Conferir o conteúdo contra o gabarito oficial do livro é
  trabalho de revisão humana — os gabaritos usados estão citados na mensagem de
  commit de cada módulo.
- **Qualidade pedagógica.** Se uma explicação (`why`) está confusa, se uma dica
  está errada ou se um exercício é ambíguo, nenhum teste reclama.
- **Acessibilidade.** Navegação por teclado, leitor de tela, contraste e foco
  não são verificados.
- **Aparência.** Não há comparação de imagens; o `layout.mjs` só mede altura da
  lousa e estouro de tabela.
- **O caminho do erro.** Os testes acertam tudo de propósito. A correção
  instantânea — o que o aluno vê quando erra — não é exercitada em lugar nenhum.
