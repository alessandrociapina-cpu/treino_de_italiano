# Parliamo! — Italiano para brasileiros 🇧🇷 → 🇮🇹

PWA de treino de gramática italiana para alunos brasileiros, baseado no livro
*Grammatica in contesto* (Loescher Editore).

## O que já existe

- **Tela de introdução** animada (tricolor, voo Brasil → Itália, palavras flutuando).
- **Módulo 1 — Nomi: genere e numero** (Capítulo 1 do livro):
  - 18 regras, cada uma escrita **letra a letra numa lousa** (italiano + tradução em português),
    com a tabela de exemplos aparecendo em seguida, pronúncia (🔊) e uma *dica para brasileiros*.
  - Painel lateral **"Tocca a te!"** com exercícios da regra e **correção instantânea**
    (o que você respondeu, a forma correta e o porquê).
  - Os **Esercizi 1–3 do livro** como verificação final.
  - **Placar final** com nota, estrelas, desempenho por regra e revisão dos erros.
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
js/data/curriculum.js   roteiro dos capítulos
sw.js                   cache offline
```

### Adicionar um capítulo

Crie `js/data/capitoloN.js` no mesmo formato de `capitolo1.js`, registre-o em
`modules` dentro de `js/data/curriculum.js` e inclua o arquivo na lista `SHELL` de `sw.js`
(aumentando `VERSION`).
