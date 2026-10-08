# Parliamo! — Italiano para brasileiros 🇧🇷 → 🇮🇹

PWA de treino de gramática italiana para alunos brasileiros, baseado no livro
*Grammatica in contesto* (Loescher Editore).

## O que já existe

- **Tela de introdução** animada (tricolor, voo Brasil → Itália, palavras flutuando).
- **Onze módulos prontos** (Capítulos 1 a 11 do livro):
  - Cada regra escrita **letra a letra numa lousa** (italiano + tradução em português),
    com a tabela de exemplos aparecendo em seguida, pronúncia (🔊) e uma *dica para brasileiros*.
  - Painel lateral **"Tocca a te!"** com exercícios da regra e **correção instantânea**
    (o que você respondeu, a forma correta e o porquê).
  - Os **exercícios do livro** como verificação final, com o gabarito oficial.
  - **Placar final** com nota, estrelas, desempenho por regra e revisão dos erros.

| Módulo | Capítulo | Regras | Exercícios | Partes |
|---|---|---:|---:|---:|
| 1 | *Nomi: genere e numero* | 18 | 185 | 1 |
| 2 | *Articoli determinativi e indeterminativi* | 10 | 248 | 3 |
| 3 | *Aggettivi: concordanza* | 11 | 222 | 3 |
| 4 | *Essere e avere: indicativo presente* | 8 | 202 | 3 |
| 5 | *Indicativo presente: verbi regolari e irregolari* | 20 | 451 | 7 |
| 6 | *Aggettivi e pronomi possessivi* | 6 | 127 | 2 |
| 7 | *Interrogativi* | 8 | 151 | 3 |
| 8 | *Verbi riflessivi e pronominali* | 9 | 159 | 3 |
| 9 | *Preposizioni e avverbi* | 18 | 389 | 6 |
| 10 | *Verbo piacere* | 8 | 164 | 2 |
| 11 | *Indicativo passato prossimo* | 14 | 338 | 5 |

- **Capítulos longos saem divididos em partes**, cada uma com seu placar e histórico
  (de 42 a 87 exercícios por parte). O reforço continua valendo para o capítulo inteiro.
- **Rinforzo**: exercícios novos (fora do livro) em 3 níveis — Facile, Medio, Difficile —
  sorteados a cada rodada.
- **Histórico** salvo no aparelho (localStorage): cada estudo, data e % de acerto;
  a lição em andamento pode ser retomada e qualquer estudo pode ser refeito para melhorar.
- Funciona **offline** e pode ser **instalado** no celular (service worker + manifest).

## Rodar localmente

Não há build. Sirva a pasta com qualquer servidor estático:

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

Para publicar, basta hospedar os arquivos estáticos (ex.: GitHub Pages).

## Estrutura

```
index.html              página única
css/style.css           estilos (tema claro/escuro)
js/app.js               telas e navegação (intro, início, lição, reforço, resultado, histórico)
js/quiz.js              desenho das questões e correção
js/ui.js                animações (lousa, confete), voz em italiano
js/storage.js           histórico e sessões no localStorage
js/data/capitolo1.js    conteúdo do Capítulo 1 (regras, exercícios, reforço)
js/data/capitolo2.js    conteúdo do Capítulo 2
js/data/capitolo3.js    conteúdo do Capítulo 3
js/data/capitolo4.js    conteúdo do Capítulo 4
js/data/capitolo5.js    conteúdo do Capítulo 5
js/data/capitolo6.js    conteúdo do Capítulo 6
js/data/capitolo7.js    conteúdo do Capítulo 7
js/data/capitolo8.js    conteúdo do Capítulo 8
js/data/capitolo9.js    conteúdo do Capítulo 9
js/data/capitolo10.js   conteúdo do Capítulo 10
js/data/capitolo11.js   conteúdo do Capítulo 11
js/data/helpers.js      construtores das questões (gênero, plural, artigo, adjetivo, verbo…)
js/data/curriculum.js   roteiro dos capítulos
sw.js                   cache offline
```

### Adicionar um capítulo

Crie `js/data/capitoloN.js` no mesmo formato de `capitolo1.js`, registre-o em
`modules` dentro de `js/data/curriculum.js` e inclua o arquivo na lista `SHELL` de `sw.js`
(aumentando `VERSION`).

Se o capítulo for longo, exporte `parts: [{ id, num, title, pt, desc, rules, book }]` em vez de
`rules`/`book` soltos, como em `capitolo2.js`. Quem não tem `parts` vira uma parte única.
