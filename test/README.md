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
| `layout.mjs` | No celular (390px) e no desktop a lousa mantém altura constante entre os passos (se oscila, a página pula enquanto o aluno estuda) e o conteúdo não vaza da altura reservada; no celular, nenhuma tabela estoura o invólucro que rola na horizontal. |
| `hscroll.mjs` | A 390px a página nunca rola na horizontal, em nenhum passo de nenhuma parte de nenhum capítulo. É o mais lento, e já pegou uma regressão que nenhum outro pegou. |
| `subpath.mjs` | O app funciona servido num subcaminho, que é como o GitHub Pages o entrega (`/treino_de_italiano/`): intro, home, lição, escopo do service worker e `start_url`/ícones do manifest. |

`lib.mjs` tem as peças comuns: o servidor estático, a resolução do Playwright e
as rotinas que respondem um passo e avançam a lição.

## Problemas conhecidos

O `layout.mjs` mantém uma lista `CONHECIDOS`: problemas já diagnosticados que
ficam registrados em vez de reprovar o conjunto, para que uma falha nova não se
confunda com uma velha. Se um deles parar de acontecer, o teste avisa para tirar
da lista.

Hoje a lista está **vazia**. Os nove problemas que ela registrava (todos dos
capítulos 1 a 8) foram corrigidos:

- **A lousa saltava entre as regras e os exercícios** (caps. 1, 5g, 7c — e, sem
  que o teste visse, também no desktop). O *Promemoria* agora entra na medição
  de `measureBoards` com altura limitada (`.board-measure .memo-list`), e a lousa
  usa `height: var(--board-h)` em vez de `min-height`. Com altura definida, o
  resumo ocupa o espaço que sobra e rola, sem esticar a lousa.
- **Seis tabelas mais largas que a tela** (caps. 5b, 5d, 5e ×3, 8a). Foram
  remodeladas como as dos capítulos 9 em diante: sem o cabeçalho "Persona",
  tabela por infinitivo com só as pessoas que a regra trata, ou menos colunas.

Como a altura da lousa agora é fixa, o `layout.mjs` também confere que o
conteúdo não vaza dela — se a medição sair menor que o conteúdo real, o teste
reprova.

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
  lousa, vazamento do conteúdo e estouro de tabela.
- **O caminho do erro.** Os testes acertam tudo de propósito. A correção
  instantânea — o que o aluno vê quando erra — não é exercitada em lugar nenhum.
