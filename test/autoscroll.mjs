// A página não pode rolar sozinha quando a lousa termina de escrever.
//
// No celular o painel de exercícios fica abaixo da lousa. Se o app pula para
// ele assim que a animação acaba, quem ainda está lendo a regra perde a linha.
// Quem terminou de ler desce sozinho.
//
//   node test/autoscroll.mjs
import { serve, browser, newPage, MOBILE, report } from './lib.mjs';

// Um scroll suave de verdade move bem mais que isto; a folga é só para
// arredondamento e para a barra de endereço do navegador.
const FOLGA = 8;

// Partes com lousa mais alta que a tela, que é quando o salto aparecia.
const CASOS = [[1, 'u'], [9, 'a'], [18, 'a']];

const { base, close } = await serve();
const b = await browser();
const failures = [];

for (const [cap, parte] of CASOS) {
  const p = await newPage(b, MOBILE);
  await p.goto(`${base}#/modulo/${cap}/${parte}`);
  await p.waitForTimeout(400);
  await p.click('text=Cominciamo!');
  await p.waitForSelector('.panel.locked', { timeout: 10000 });

  // O aluno desce um pouco para acompanhar a escrita na lousa.
  await p.evaluate(() => window.scrollTo(0, 200));
  await p.waitForTimeout(400);
  const antes = await p.evaluate(() => Math.round(window.scrollY));

  // Espera a animação terminar e dá tempo para um scroll suave acontecer.
  await p.waitForSelector('.panel.unlocked', { timeout: 60000 });
  await p.waitForTimeout(1800);
  const depois = await p.evaluate(() => Math.round(window.scrollY));

  const moveu = Math.abs(depois - antes);
  console.log(`  cap ${cap} parte ${parte}: ${antes}px → ${depois}px ${moveu > FOLGA ? '✗' : '✓'}`);
  if (moveu > FOLGA) {
    failures.push(`cap ${cap} parte ${parte}: a página rolou sozinha de ${antes}px para ${depois}px ao fim da animação`);
  }
  await p.context().close();
}

await b.close();
await close();
report('rolagem automática', failures);
