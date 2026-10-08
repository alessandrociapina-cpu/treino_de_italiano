// Percorre cada parte do capítulo respondendo tudo com o gabarito do próprio
// módulo de dados e exige 100%. Depois joga uma rodada de cada nível de
// reforço. Qualquer erro de console ou requisição falha reprova.
//
//   node test/lesson.mjs          todos os capítulos
//   node test/lesson.mjs 17 18    só esses
import { serve, browser, newPage, questionMap, chapterPlan, listChapters, answerStep, nextStep, chaptersFromArgv, report } from './lib.mjs';

const { base, close } = await serve();
const b = await browser();
const p = await newPage(b);
await p.goto(`${base}#/home`);

const caps = chaptersFromArgv((await listChapters(p)).map((c) => c.id));
const failures = [];

for (const cap of caps) {
  const plan = await chapterPlan(p, cap);
  const qmap = await questionMap(p, cap);
  const total = plan.parts.reduce((a, x) => a + x.n, 0);
  console.log(`\nCap. ${cap} — ${plan.title}`);
  console.log(`  ${plan.parts.map((x) => `${x.num}=${x.n}`).join(' ')} | total ${total} | reforço ${Object.values(plan.practice).join('/')}`);

  for (const part of plan.parts) {
    await p.goto(`${base}#/modulo/${cap}/${part.id}`);
    await p.waitForTimeout(400);
    await p.click('text=Cominciamo!');
    let answered = 0;
    for (let step = 0; step < 40; step++) {
      await p.waitForSelector('.panel', { timeout: 8000 });
      answered += await answerStep(p, qmap);
      if (!(await nextStep(p))) break;
    }
    const placar = await p.waitForSelector('.ring-label', { timeout: 15000 }).catch(() => null);
    if (!placar) {
      failures.push(`cap ${cap} parte ${part.num}: não chegou à tela de resultado`);
      continue;
    }
    await p.waitForTimeout(2200);
    const score = await p.$eval('.ring-label', (e) => e.textContent);
    const wrong = await p.$$eval('.mistakes li', (l) => l.map((x) => x.textContent.slice(0, 120)));
    const ok = answered === part.n && score.trim().startsWith('100');
    console.log(`  parte ${part.num} (${part.title}): ${answered}/${part.n} · ${score}`);
    if (!ok) failures.push(`cap ${cap} parte ${part.num}: respondeu ${answered}/${part.n}, nota ${score}`);
    for (const w of wrong) failures.push(`cap ${cap} parte ${part.num} errou: ${w}`);
  }

  // Reforço: as respostas aqui são de propósito erradas; o que se testa é que
  // os três níveis sorteiam e avançam sem quebrar.
  for (const lvl of [1, 2, 3]) {
    await p.goto(`${base}#/reforco/${cap}/${lvl}`);
    await p.waitForTimeout(400);
    for (let i = 0; i < 10; i++) {
      const it = await p.$('.q');
      if (!it) { failures.push(`cap ${cap} reforço ${lvl}: sem questão na rodada ${i + 1}`); break; }
      const inp = await it.$('input');
      if (inp) { await inp.fill('xyz'); await inp.press('Enter'); } else await (await it.$('button.opt')).click();
      await p.click('.pc-actions .btn');
      await p.waitForTimeout(120);
    }
  }
}

for (const e of p.errors) failures.push(e);
await b.close();
await close();
report('lições', failures);
