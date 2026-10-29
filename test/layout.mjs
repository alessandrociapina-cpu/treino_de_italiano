// No celular (390px) e no desktop, cada parte tem de manter a lousa com altura
// constante entre os passos — se ela oscila, a página "pula" enquanto o aluno
// estuda — sem que o conteúdo vaze da altura reservada. No celular, nenhuma
// tabela pode estourar o invólucro que rola na horizontal.
//
//   node test/layout.mjs          todos os capítulos
//   node test/layout.mjs 17 18    só esses
import { serve, browser, newPage, MOBILE, DESKTOP, questionMap, listChapters, answerStep, nextStep, chaptersFromArgv, report } from './lib.mjs';

// Uma folga de poucos pixels dentro do invólucro é invisível e não vale alarme.
const TABLE_SLACK = 4;

// Problemas já diagnosticados e ainda não corrigidos. Ficam listados em vez de
// reprovar o conjunto, para que uma falha nova não se confunda com uma velha.
// Se um deles parar de acontecer, o teste avisa para tirar daqui.
// Formato: { chave: 'cap 5 parte b (Regra 8', porque: 'explicação' }
const CONHECIDOS = [];

const { base, close } = await serve();
const b = await browser();
const probe = await newPage(b);
await probe.goto(`${base}#/home`);
const all = await listChapters(probe);
const caps = chaptersFromArgv(all.map((c) => c.id));
const failures = [];

for (const cap of caps) {
  const parts = all.find((c) => c.id === cap).parts;
  const qmap = await questionMap(probe, cap);
  const linha = [];

  for (const [tela, viewport] of [['celular', MOBILE], ['desktop', DESKTOP]]) for (const part of parts) {
    const onde = tela === 'celular' ? `parte ${part}` : `parte ${part} (desktop)`;
    // Contexto novo por parte: o histórico salvo mudaria o ponto de partida.
    const p = await newPage(b, viewport);
    await p.goto(`${base}#/modulo/${cap}/${part}`);
    await p.waitForTimeout(350);
    await p.click('text=Cominciamo!');
    const alturas = new Set();

    for (let step = 0; step < 60; step++) {
      await p.waitForSelector('.panel', { timeout: 8000 });
      // Mede algumas vezes: a lousa é animada e precisa estar estável.
      for (let t = 0; t < 6; t++) {
        alturas.add(await p.evaluate(() => document.querySelector('.lesson-grid > .board')?.offsetHeight));
        await p.waitForTimeout(200);
      }
      // A altura é fixa: se a medição sair menor que o conteúdo, ele vaza da lousa.
      const vaza = await p.evaluate(() => {
        const c = document.querySelector('.lesson-grid > .board .board-content');
        return c ? c.scrollHeight - c.clientHeight : 0;
      });
      if (vaza > 2) {
        const titulo = await p.$eval('.step-title', (e) => e.textContent.trim());
        failures.push(`cap ${cap} ${onde} (${titulo}): conteúdo vaza da lousa +${vaza}px`);
      }
      const over = tela === 'desktop' ? 0 : await p.evaluate(() => {
        const t = document.querySelector('.chalk-table');
        return t ? t.scrollWidth - t.parentElement.clientWidth : 0;
      });
      if (over > TABLE_SLACK) {
        const titulo = await p.$eval('.step-title', (e) => e.textContent.trim());
        failures.push(`cap ${cap} ${onde} (${titulo}): tabela estoura +${over}px`);
      }
      await answerStep(p, qmap);
      if (!(await nextStep(p))) break;
    }

    if (alturas.size !== 1) failures.push(`cap ${cap} ${onde}: lousa oscila entre ${[...alturas].join(', ')}px`);
    linha.push(`${tela === 'desktop' ? `${part}·d` : part}=${[...alturas].join('/')}`);
    await p.context().close();
  }
  console.log(`Cap. ${cap} — alturas da lousa: ${linha.join(' ')}`);
}

await b.close();
await close();

// Separa o que já era conhecido do que é novo.
const novos = [];
const vistos = new Set();
for (const f of failures) {
  const c = CONHECIDOS.find((k) => f.startsWith(k.chave));
  if (c) { vistos.add(c.chave); console.log(`\n⚠ conhecido — ${f}\n  ${c.porque}`); } else novos.push(f);
}
for (const c of CONHECIDOS) {
  if (!vistos.has(c.chave) && !process.argv.slice(2).length) {
    console.log(`\n✓ "${c.chave}" não acontece mais — tire da lista CONHECIDOS em test/layout.mjs`);
  }
}

report('layout da lousa', novos);
