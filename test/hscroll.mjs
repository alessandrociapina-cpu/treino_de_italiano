// Numa tela de 390px a página nunca pode rolar na horizontal. Este teste
// caminha por todos os passos de todas as partes de todos os capítulos —
// é o mais lento do conjunto (uns 20 minutos no total), e já pegou uma
// regressão que nenhum outro pegou.
//
//   node test/hscroll.mjs         todos os capítulos
//   node test/hscroll.mjs 18      só esse
import { serve, browser, newPage, MOBILE, questionMap, listChapters, answerStep, nextStep, chaptersFromArgv, report } from './lib.mjs';

const { base, close } = await serve();
const b = await browser();
const p = await newPage(b, MOBILE);
await p.goto(`${base}#/home`);

const all = await listChapters(p);
const caps = chaptersFromArgv(all.map((c) => c.id));
const failures = [];

const scrolled = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

if (await scrolled() > 1) failures.push(`home: rola +${await scrolled()}px`);

for (const cap of caps) {
  const parts = all.find((c) => c.id === cap).parts;
  const qmap = await questionMap(p, cap);
  for (const part of parts) {
    await p.goto(`${base}#/modulo/${cap}/${part}`);
    await p.waitForTimeout(300);
    await p.click('text=Cominciamo!').catch(() => {});
    for (let step = 0; step < 60; step++) {
      await p.waitForSelector('.panel', { timeout: 8000 });
      await p.waitForTimeout(250);
      const o = await scrolled();
      if (o > 1) {
        const titulo = await p.$eval('.step-title', (e) => e.textContent.trim());
        failures.push(`cap ${cap} parte ${part} passo ${step} (${titulo}): +${o}px`);
      }
      await answerStep(p, qmap);
      if (!(await nextStep(p))) break;
    }
  }
  console.log(`cap ${cap} ✓`);
}

await b.close();
await close();
report('rolagem horizontal', failures);
