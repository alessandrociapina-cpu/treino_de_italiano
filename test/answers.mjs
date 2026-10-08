// Toda resposta declarada como aceita (inclusive as alternativas de `a: [...]`)
// tem de passar pelo check() do próprio app, e toda questão de múltipla
// escolha tem de ter a resposta certa entre as opções.
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
  const { check } = await import('./js/quiz.js');
  const bad = [];
  let n = 0;
  for (const cap of caps) {
    const m = modules[cap];
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
      }
    }
  }
  return { bad, n };
}, caps);

console.log(`${res.n} respostas aceitas verificadas em ${caps.length} capítulo(s).`);
await b.close();
await close();
report('respostas', [...res.bad, ...p.errors]);
