// No celular (390px), cada parte tem de manter a lousa com altura constante
// entre os passos — se ela oscila, a página "pula" enquanto o aluno estuda —
// e nenhuma tabela pode estourar o invólucro que rola na horizontal.
//
//   node test/layout.mjs          todos os capítulos
//   node test/layout.mjs 17 18    só esses
import { serve, browser, newPage, MOBILE, questionMap, listChapters, answerStep, nextStep, chaptersFromArgv, report } from './lib.mjs';

// Uma folga de poucos pixels dentro do invólucro é invisível e não vale alarme.
const TABLE_SLACK = 4;

// Problemas já diagnosticados e ainda não corrigidos. Ficam listados em vez de
// reprovar o conjunto, para que uma falha nova não se confunda com uma velha.
// Se um deles parar de acontecer, o teste avisa para tirar daqui.
const MEMO = 'measureBoards chama bookBoard(b, quiet) sem passar as regras (js/app.js), '
  + 'então o Promemoria fica vazio na medição e a altura reservada sai menor que a real. '
  + 'Passadas as regras, cada lousa de exercício fica na sua altura natural. O .memo '
  + 'deveria encolher e rolar (flex:1 + overflow-y:auto), mas isso exige altura definida: '
  + 'no desktop ela vem da coluna ao lado, no celular a lousa só tem min-height e cresce.';

const TABELA = 'Tabela mais larga que a tela. Não quebra nada — o .table-wrap rola na '
  + 'horizontal e a página não acompanha (o hscroll passa) —, mas o aluno precisa arrastar '
  + 'a tabela para ler o fim. Dos capítulos 9 em diante as tabelas foram remodeladas (menos '
  + 'colunas, cabeçalhos curtos) para caber; nos primeiros não, porque esta checagem ainda '
  + 'não existia.';

const CONHECIDOS = [
  { chave: 'cap 1 parte u: lousa oscila', porque: MEMO },
  { chave: 'cap 5 parte g: lousa oscila', porque: MEMO },
  { chave: 'cap 7 parte c: lousa oscila', porque: MEMO },
  { chave: 'cap 5 parte b (Regra 8', porque: TABELA },
  { chave: 'cap 5 parte d (Regra 13', porque: TABELA },
  { chave: 'cap 5 parte e (Regra 14', porque: TABELA },
  { chave: 'cap 5 parte e (Regra 15', porque: TABELA },
  { chave: 'cap 5 parte e (Regra 16', porque: TABELA },
  { chave: 'cap 8 parte a (Regra 1', porque: TABELA },
];

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

  for (const part of parts) {
    // Contexto novo por parte: o histórico salvo mudaria o ponto de partida.
    const p = await newPage(b, MOBILE);
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
      const over = await p.evaluate(() => {
        const t = document.querySelector('.chalk-table');
        return t ? t.scrollWidth - t.parentElement.clientWidth : 0;
      });
      if (over > TABLE_SLACK) {
        const titulo = await p.$eval('.step-title', (e) => e.textContent.trim());
        failures.push(`cap ${cap} parte ${part} (${titulo}): tabela estoura +${over}px`);
      }
      await answerStep(p, qmap);
      if (!(await nextStep(p))) break;
    }

    if (alturas.size !== 1) failures.push(`cap ${cap} parte ${part}: lousa oscila entre ${[...alturas].join(', ')}px`);
    linha.push(`${part}=${[...alturas].join('/')}`);
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

report('layout no celular', novos);
