// Roda o conjunto inteiro. O hscroll é o lento (uns 20 minutos); use
// --rapido para deixá-lo de fora.
//
//   node test/all.mjs
//   node test/all.mjs --rapido
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const aqui = (f) => fileURLToPath(new URL(f, import.meta.url));
const rapido = process.argv.includes('--rapido');
const caps = process.argv.slice(2).filter((a) => /^\d+$/.test(a));

// Estes escolhem os próprios casos e não recebem capítulos.
const SEM_CAPITULOS = ['subpath.mjs', 'autoscroll.mjs'];

const suites = [
  ['respostas', 'answers.mjs'],
  ['lições', 'lesson.mjs'],
  ['layout no celular', 'layout.mjs'],
  ['rolagem automática', 'autoscroll.mjs'],
  ['subcaminho', 'subpath.mjs'],
  ...(rapido ? [] : [['rolagem horizontal', 'hscroll.mjs']]),
];

const falhou = [];
for (const [nome, arquivo] of suites) {
  console.log(`\n${'='.repeat(60)}\n${nome}\n${'='.repeat(60)}`);
  const t = Date.now();
  const args = SEM_CAPITULOS.includes(arquivo) ? [] : caps;
  const code = await new Promise((ok) => {
    spawn(process.execPath, [aqui(arquivo), ...args], { stdio: 'inherit' }).on('close', ok);
  });
  console.log(`(${Math.round((Date.now() - t) / 1000)}s)`);
  if (code !== 0) falhou.push(nome);
}

console.log(`\n${'='.repeat(60)}`);
if (falhou.length) {
  console.log(`✗ reprovou: ${falhou.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`✓ tudo passou${rapido ? ' (sem o hscroll)' : ''}`);
}
