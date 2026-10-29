// Toda resposta declarada como aceita (inclusive as alternativas de `a: [...]`)
// tem de passar pelo check() do próprio app, e toda questão de múltipla
// escolha tem de ter a resposta certa entre as opções.
//
// Também confere a posição da resposta certa nas questões de múltipla escolha,
// na ordem em que o aluno as vê: se ela cai quase sempre no mesmo lugar, dá
// para acertar sem ler. E a ordem de cada questão tem de ser estável, para as
// opções não trocarem de lugar quando o painel se redesenha.
//
// Roda dentro do navegador porque js/quiz.js depende de `window`.
//
//   node test/answers.mjs         todos os capítulos
//   node test/answers.mjs 18      só esse
import { serve, browser, newPage, listChapters, chaptersFromArgv, report } from './lib.mjs';

const { base, close } = await serve();
const b = await browser();
const p = await newPage(b);
await p.goto(`${base}#/home`);

const caps = chaptersFromArgv((await listChapters(p)).map((c) => c.id));

const res = await p.evaluate(async (caps) => {
  const { modules } = await import('./js/data/curriculum.js');
  const { check, renderQuestion } = await import('./js/quiz.js');
  const bad = [];
  const posicoes = [];
  let n = 0;
  for (const cap of caps) {
    const m = modules[cap];
    const pos = { n: 0, porLugar: {} };
    const groups = [
      ...m.rules.map((r) => [`regra ${r.id}`, r.exercises]),
      ...m.book.map((bk) => [`livro ${bk.id}`, bk.questions]),
      ...Object.entries(m.practice).map(([l, v]) => [`reforço ${l}`, v.pool]),
    ];
    for (const [tag, qs] of groups) {
      for (const q of qs) {
        const as = Array.isArray(q.a) ? q.a : [q.a];
        for (const v of as) {
          n++;
          if (!check(q, v).ok) bad.push(`cap ${cap} / ${tag} / ${q.id} / rejeitou ${JSON.stringify(v)}`);
        }
        if (q.type === 'choice' && !q.opts.includes(as[0])) {
          bad.push(`cap ${cap} / ${tag} / ${q.id} / resposta fora das opções`);
        }
        if (q.kind === 'mc') {
          const ordem = (box) => [...box.querySelectorAll('button.opt')].map((x) => x.dataset.v);
          const vista = ordem(renderQuestion(q, {}));
          if (vista.join('|') !== ordem(renderQuestion(q, {})).join('|')) bad.push(`cap ${cap} / ${tag} / ${q.id} / a ordem das opções muda a cada desenho`);
          const i = vista.indexOf(as[0]);
          pos.n++;
          pos.porLugar[i] = (pos.porLugar[i] || 0) + 1;
        }
      }
    }
    if (pos.n) {
      posicoes.push(`cap ${cap}: ${Object.entries(pos.porLugar).map(([i, k]) => `${+i + 1}ª ${k}`).join(', ')}`);
      // Com 10 questões ou mais, nenhum lugar pode concentrar mais de 60% das respostas.
      const max = Math.max(...Object.values(pos.porLugar));
      if (pos.n >= 10 && max / pos.n > 0.6) bad.push(`cap ${cap}: ${max} de ${pos.n} respostas de múltipla escolha no mesmo lugar`);
    }
  }
  return { bad, n, posicoes };
}, caps);

console.log(`${res.n} respostas aceitas verificadas em ${caps.length} capítulo(s).`);
console.log(`Posição da resposta certa na múltipla escolha:\n  ${res.posicoes.join('\n  ')}`);
await b.close();
await close();
report('respostas', [...res.bad, ...p.errors]);
