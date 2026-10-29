// O caminho do erro: o que o aluno vê quando erra, que é o coração pedagógico
// do app e que os outros testes (que acertam tudo de propósito) nunca tocam.
//
// 1. Em cada questão de cada capítulo (regras, livro e reforço), dentro do
//    navegador: responde errado como o aluno faria (clique ou Enter) e confere
//    a correção — a resposta é recusada, a questão trava, a opção errada e a
//    certa ficam marcadas, aparece o que o aluno escreveu, a resposta certa
//    (que o próprio check() aceita), a explicação e a regra a revisar. Confere
//    também a resposta só sem acento e a correção redesenhada ao retomar.
// 2. Na interface, por capítulo: percorre a primeira parte errando metade das
//    questões, recarrega no meio, e confere placar, tela de resultado, revisão
//    dos erros, desempenho por regra e histórico. Depois erra no reforço.
//
//   node test/errors.mjs          todos os capítulos
//   node test/errors.mjs 17 18    só esses
import { serve, browser, newPage, listChapters, chapterPlan, chaptersFromArgv, nextStep, boardStable, report } from './lib.mjs';

const { base, close } = await serve();
const b = await browser();
const p = await newPage(b);
await p.goto(`${base}#/home`);

const caps = chaptersFromArgv((await listChapters(p)).map((c) => c.id));
const failures = [];

// ───────────── 1. A correção de cada questão ─────────────
const unit = await p.evaluate(async (caps) => {
  const { modules } = await import('./js/data/curriculum.js');
  const { renderQuestion, check, answerText } = await import('./js/quiz.js');
  const bad = [];
  const stats = { wrong: 0, accent: 0 };
  const accepted = (q) => (Array.isArray(q.a) ? q.a : [q.a]);
  const plain = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const lastWord = (s) => (s.match(/(\S+)$/) || ['', ''])[1];
  const GENDER = { m: 'maschile', f: 'femminile' };
  const joinArt = (art, w) => (art === '—' ? w : art.endsWith("'") ? art + w : `${art} ${w}`);
  // O que o aluno deveria ver riscado, escrito de forma independente do app.
  const shown = (q, g) => {
    if (q.kind === 'gender') return GENDER[g];
    if (q.kind === 'ending' && g.length <= 3) return q.stem + g;
    if (q.kind === 'fill' && g.length <= 3) return lastWord(q.before) + g;
    if (q.kind === 'article') return q.ctx ? q.ctx.replace('___', g === '—' ? '' : g).replace(/\s+/g, ' ').trim() : joinArt(g, q.w);
    return g;
  };
  // Lixo que denuncia texto mal montado na tela.
  // ("nulla" é italiano, por isso \bnull\b.)
  const junk = /undefined|\bnull\b|NaN|\[object|<\/?[a-z]+[ >]/;
  const stage = document.createElement('div');
  document.body.append(stage);

  // Responde como o aluno: clica a opção, ou digita e aperta Enter.
  const answer = (box, q, given) => {
    if (q.type === 'choice') {
      box.querySelector(`button.opt[data-v="${CSS.escape(given)}"]`).click();
    } else {
      const inp = box.querySelector('input');
      inp.value = given;
      inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    }
  };

  for (const cap of caps) {
    const m = modules[cap];
    const ruleById = Object.fromEntries(m.rules.map((r) => [r.id, r]));
    const groups = [
      ...m.rules.map((r) => [`regra ${r.num}`, r.exercises]),
      ...m.book.map((bk) => [`livro ${bk.id}`, bk.questions]),
      ...Object.entries(m.practice).map(([l, v]) => [`reforço ${l}`, v.pool]),
    ];
    for (const [where, qs] of groups) {
      for (const q of qs) {
        const tag = `cap ${cap} / ${where} / ${q.id}`;
        const fail = (msg) => bad.push(`${tag}: ${msg}`);
        const rule = ruleById[q.rule];
        if (!rule) fail(`sem regra (rule: ${JSON.stringify(q.rule)}) — a correção não diz o que revisar`);
        const as = accepted(q);

        // Uma resposta errada plausível para o tipo da questão.
        let wrong;
        if (q.type === 'choice') {
          wrong = q.opts.find((o) => !as.includes(o));
          if (wrong == null) { fail('todas as opções são aceitas: não há como errar'); continue; }
        } else {
          // Curta nas lacunas de terminação, para passar pelo "radical + letra".
          wrong = q.kind === 'ending' || q.kind === 'fill' ? 'x' : 'qwz';
        }
        if (check(q, wrong).ok) { fail(`a resposta errada ${JSON.stringify(wrong)} foi aceita`); continue; }

        // Errar ao vivo.
        stats.wrong++;
        const calls = [];
        const box = renderQuestion(q, { rule, onAnswer: (x) => calls.push(x) });
        stage.replaceChildren(box);
        answer(box, q, wrong);
        // Um segundo clique/Enter não pode contar de novo.
        if (q.type === 'choice') box.querySelector('button.opt')?.click();
        else box.querySelector('button.verify')?.click();

        if (calls.length !== 1) fail(`onAnswer chamado ${calls.length} vezes`);
        else if (calls[0].ok !== false || calls[0].given !== wrong) fail(`onAnswer recebeu ${JSON.stringify(calls[0])}`);
        if (!box.classList.contains('is-ko') || !box.classList.contains('answered')) fail('a questão não ficou marcada como errada');
        const live = [...box.querySelectorAll('button.opt, input, button.verify')].filter((n) => !n.disabled);
        if (live.length) fail(`${live.length} controle(s) seguem ativos depois da resposta`);
        if (q.type === 'choice') {
          const w = box.querySelector(`button.opt[data-v="${CSS.escape(wrong)}"]`);
          if (!w.classList.contains('wrong')) fail('a opção escolhida não ficou marcada como errada');
          const certas = [...box.querySelectorAll('button.opt.correct')].map((x) => x.dataset.v);
          if (!certas.length || certas.some((v) => !as.includes(v))) fail(`opção certa marcada errado: ${JSON.stringify(certas)}`);
        } else if (box.querySelector('input').value !== wrong) {
          fail('o campo não mostra mais o que o aluno escreveu');
        }

        const fb = box.querySelector('.feedback.ko');
        if (!fb) { fail('sem caixa de correção'); continue; }
        if (fb.getAttribute('role') !== 'alert') fail('a correção não é anunciada (role=alert) a leitores de tela');
        if (!fb.textContent.includes('Sbagliato')) fail('a correção não diz que errou');
        const tagEl = fb.querySelector('.rule-tag');
        if (rule && tagEl?.textContent !== `Regra ${rule.num}`) fail(`etiqueta da regra: ${JSON.stringify(tagEl?.textContent)}`);
        const s = fb.querySelector('s')?.textContent;
        if (s !== shown(q, wrong)) fail(`riscado ${JSON.stringify(s)}, esperado ${JSON.stringify(shown(q, wrong))}`);
        const certo = fb.querySelector('p > b')?.textContent?.trim();
        if (!certo) fail('a correção não mostra a resposta certa');
        else if (certo !== answerText(q).replace(/<[^>]+>/g, '').trim()) fail(`resposta certa mostrada ${JSON.stringify(certo)}`);
        // Nas questões de escrever, o que a correção manda escrever tem de ser aceito.
        else if (q.type === 'input' && !check(q, certo).ok) fail(`a correção manda escrever ${JSON.stringify(certo)}, que o próprio app recusa`);
        if (/[.?!…]\.$/.test(fb.querySelector('p')?.textContent ?? '')) fail(`pontuação dobrada: ${JSON.stringify(fb.querySelector('p').textContent)}`);
        const why = fb.querySelector('.fb-why');
        const whyText = why?.textContent.replace('Por quê?', '').trim();
        if (!whyText) fail('a correção não explica o porquê');
        if (junk.test(fb.textContent)) fail(`texto quebrado na correção: ${JSON.stringify(fb.textContent.match(junk)[0])} em ${JSON.stringify(fb.textContent.slice(0, 160))}`);

        // Retomar a sessão redesenha a mesma correção, sem contar de novo.
        const again = [];
        const box2 = renderQuestion(q, { rule, prev: { given: wrong, ok: false }, onAnswer: (x) => again.push(x) });
        if (again.length) fail('retomar a sessão contou a resposta de novo');
        if (box2.querySelector('.feedback.ko')?.textContent !== fb.textContent) fail('ao retomar, a correção sai diferente');

        // Só o acento errado: aceita, mas avisa.
        if (q.type === 'input') {
          const semAcento = plain(as[0]);
          if (semAcento !== as[0] && !as.includes(semAcento)) {
            stats.accent++;
            const res = check(q, semAcento);
            if (!res.ok || !res.accentOnly) fail(`sem acento (${JSON.stringify(semAcento)}): ${JSON.stringify(res)}`);
            const box3 = renderQuestion(q, { rule, onAnswer: () => {} });
            stage.replaceChildren(box3);
            answer(box3, q, semAcento);
            const ok = box3.querySelector('.feedback.ok');
            if (!ok || !ok.textContent.includes('Atenção ao acento')) fail('acertou sem acento e não foi avisado');
          }
        }
      }
    }
  }

  // O que o aluno digita vai para a tela escapado, nunca como HTML.
  const q = modules[caps[0]].rules.flatMap((r) => r.exercises).find((x) => x.type === 'input');
  if (q) {
    const box = renderQuestion(q, { onAnswer: () => {} });
    stage.replaceChildren(box);
    answer(box, q, '<img src=x>qwz');
    if (box.querySelector('.feedback img')) bad.push('o texto digitado virou HTML na correção');
  }
  stage.remove();
  return { bad, stats };
}, caps);

console.log(`Correção: ${unit.stats.wrong} respostas erradas e ${unit.stats.accent} sem acento conferidas em ${caps.length} capítulo(s).`);
failures.push(...unit.bad);

// ───────────── 2. Errar numa lição e no reforço, pela interface ─────────────

/** Mapa id → questão de um capítulo, incluindo o reforço. */
const allQuestions = (cap) => p.evaluate(async (c) => {
  const m = (await import('./js/data/curriculum.js')).modules[c];
  const q = {};
  for (const r of m.rules) for (const x of r.exercises) q[x.id] = x;
  for (const bk of m.book) for (const x of bk.questions) q[x.id] = x;
  for (const v of Object.values(m.practice)) for (const x of v.pool) q[x.id] = x;
  return q;
}, cap);

const wrongFor = (q) => (q.type === 'choice'
  ? q.opts.find((o) => o !== (Array.isArray(q.a) ? q.a : [q.a])[0] && !(Array.isArray(q.a) ? q.a : [q.a]).includes(o))
  : 'qwz');

/**
 * Responde as questões abertas do passo; erra as de posição ímpar na lição.
 * Devolve quantas acertou e quantas errou.
 */
async function answerMixed(P, qmap, tally, fail) {
  const skip = await P.$('.panel.locked .panel-lock button');
  if (skip) await skip.click();
  await P.waitForSelector('.panel.unlocked', { timeout: 15000 });
  await boardStable(P);
  for (let guard = 0; guard < 400; guard++) {
    const pendente = await P.$('.q:not(.answered)');
    if (!pendente) break;
    const id = await pendente.getAttribute('data-id');
    const q = qmap[id];
    const errar = (tally.ok + tally.ko) % 2 === 1 && wrongFor(q) != null;
    const a = errar ? wrongFor(q) : (Array.isArray(q.a) ? q.a[0] : q.a);
    const alvo = `.q[data-id="${id}"]`;
    const controle = q.type === 'choice' ? `${alvo} button[data-v="${a.replace(/"/g, '\\"')}"]` : `${alvo} input`;
    await P.waitForSelector(controle, { timeout: 8000 });
    if (q.type === 'choice') await P.click(controle);
    else { await P.fill(controle, a); await P.press(controle, 'Enter'); }
    await P.waitForSelector(`${alvo}.answered`, { timeout: 8000 });
    const marcada = await P.$eval(alvo, (e) => (e.classList.contains('is-ko') ? 'ko' : 'ok'));
    if (marcada !== (errar ? 'ko' : 'ok')) fail(`${id} marcada ${marcada}`);
    if (errar) {
      tally.ko++;
      tally.wrongIds.push(id);
      if (!(await P.$(`${alvo} .feedback.ko`))) fail(`${id}: errou e não viu a correção`);
    } else tally.ok++;
  }
  // Errar não pode travar o avanço.
  const travado = await P.$eval('.lesson-nav .btn-primary', (e) => e.disabled);
  if (travado) fail('com tudo respondido (e alguns erros), o botão de avançar segue travado');
}

const pctOf = (ok, total) => (ok >= total ? 100 : Math.min(99, Math.round((ok / total) * 100)));

for (const cap of caps) {
  const plan = await chapterPlan(p, cap);
  const part = plan.parts[0];
  const qmap = await allQuestions(cap);
  const where = `cap ${cap} parte ${part.num}`;
  const fail = (msg) => failures.push(`${where}: ${msg}`);
  const tally = { ok: 0, ko: 0, wrongIds: [] };

  // Contexto novo: o histórico de outro capítulo não pode interferir.
  const P = await newPage(b);
  await runLesson(P);
  for (const e of P.errors) fail(e);
  await P.context().close();
  console.log(`  ${where}: ${tally.ok} certas, ${tally.ko} erradas`);

  async function runLesson(P) {
    {
      await P.goto(`${base}#/modulo/${cap}/${part.id}`);
      await P.waitForTimeout(350);
      await P.click('text=Cominciamo!');
      let recarregou = false;
      for (let step = 0; step < 60; step++) {
        await P.waitForSelector('.panel', { timeout: 8000 });
        await answerMixed(P, qmap, tally, fail);
        // Uma vez, no meio: recarrega e confere que os erros voltam com a correção.
        if (!recarregou && tally.ko > 0) {
          recarregou = true;
          await P.reload();
          await P.waitForSelector('.panel', { timeout: 8000 });
          const ultimo = tally.wrongIds[tally.wrongIds.length - 1];
          const volta = await P.$(`.q[data-id="${ultimo}"].is-ko .feedback.ko`);
          if (!volta) fail(`depois de recarregar, o erro em ${ultimo} sumiu`);
          const chip = await P.$eval('.score-chip', (e) => e.textContent);
          if (!chip.includes(String(tally.ok))) fail(`placar depois de recarregar: ${JSON.stringify(chip)} (acertos: ${tally.ok})`);
        }
        if (!(await nextStep(P))) break;
      }

      await P.waitForSelector('.ring-label', { timeout: 15000 });
      const total = tally.ok + tally.ko;
      if (total !== part.n) fail(`respondeu ${total} de ${part.n}`);
      const score = (await P.$eval('.ring-label', (e) => e.textContent)).trim();
      if (!score.startsWith(String(pctOf(tally.ok, total)))) fail(`nota ${score}, esperado ${pctOf(tally.ok, total)}%`);
      const nums = await P.$$eval('.result-stats .stat b, .result-stats .stat strong', (l) => l.map((x) => x.textContent.trim()));
      if (nums[0] !== String(tally.ok) || nums[1] !== String(tally.ko)) fail(`acertos/erros ${nums.slice(0, 2).join('/')}, esperado ${tally.ok}/${tally.ko}`);

      const titulo = await P.$eval('.mistakes', (e) => e.closest('.card').querySelector('h3').textContent).catch(() => '');
      if (titulo !== `Revise seus erros (${tally.ko})`) fail(`título da revisão: ${JSON.stringify(titulo)}`);
      const itens = await P.$$eval('.mistakes li', (l) => l.map((li) => ({
        label: li.querySelector('.mi-q b')?.textContent.trim(),
        tag: li.querySelector('.rule-tag')?.textContent,
        s: li.querySelector('.mi-a s')?.textContent.trim(),
        b: li.querySelector('.mi-a b')?.textContent.trim(),
        why: li.querySelector('.mi-why')?.textContent.trim(),
        all: li.textContent,
      })));
      if (itens.length !== tally.ko) fail(`${itens.length} erros na revisão, esperado ${tally.ko}`);
      itens.forEach((it, i) => {
        const id = tally.wrongIds[i];
        if (!it.label) fail(`revisão de ${id}: sem o enunciado`);
        if (!it.tag) fail(`revisão de ${id}: sem a regra a revisar`);
        if (!it.s) fail(`revisão de ${id}: não mostra o que o aluno respondeu`);
        if (!it.b) fail(`revisão de ${id}: não mostra a resposta certa`);
        if (!it.why) fail(`revisão de ${id}: sem explicação`);
        if (/undefined|\bnull\b|NaN|\[object/.test(it.all)) fail(`revisão de ${id}: texto quebrado ${JSON.stringify(it.all.slice(0, 140))}`);
      });

      // Desempenho por regra: os erros têm de cair em regras que aparecem ali.
      const chips = await P.$$eval('.rule-chip small', (l) => l.map((x) => x.textContent));
      const somados = chips.reduce((a, t) => a + Number((t.match(/(\d+) erro/) || [0, 0])[1]), 0);
      if (somados !== tally.ko) fail(`desempenho por regra soma ${somados} erros, esperado ${tally.ko}`);

      await P.goto(`${base}#/historico`);
      const hist = await P.$eval('.history li', (e) => e.textContent).catch(() => '');
      if (!hist.includes(`${tally.ok}/${total} acertos`)) fail(`histórico: ${JSON.stringify(hist.slice(0, 120))}`);

      // Reforço: erra a primeira, acerta o resto.
      await P.goto(`${base}#/reforco/${cap}/1`);
      await P.waitForSelector('.q', { timeout: 8000 });
      let rOk = 0;
      let rKo = 0;
      for (let i = 0; i < 10; i++) {
        const box = await P.$('.q');
        const id = await box.getAttribute('data-id');
        const q = qmap[id];
        const errar = i === 0 && wrongFor(q) != null;
        const a = errar ? wrongFor(q) : (Array.isArray(q.a) ? q.a[0] : q.a);
        if (q.type === 'choice') await P.click(`.q button[data-v="${a.replace(/"/g, '\\"')}"]`);
        else { await P.fill('.q input', a); await P.press('.q input', 'Enter'); }
        if (errar) {
          rKo++;
          if (!(await P.$('.q.is-ko .feedback.ko'))) fail(`reforço ${id}: errou e não viu a correção`);
        } else rOk++;
        const prox = await P.$('.pc-actions .btn:not(.hidden)');
        if (!prox) { fail(`reforço ${id}: depois de responder não aparece como seguir`); break; }
        await prox.click();
        await P.waitForTimeout(80);
      }
      await P.waitForSelector('.ring-label', { timeout: 8000 });
      const rScore = (await P.$eval('.ring-label', (e) => e.textContent)).trim();
      if (!rScore.startsWith(String(pctOf(rOk, rOk + rKo)))) fail(`reforço: nota ${rScore}, esperado ${pctOf(rOk, rOk + rKo)}%`);
      const rItens = await P.$$eval('.mistakes li', (l) => l.length);
      if (rItens !== rKo) fail(`reforço: ${rItens} erros na revisão, esperado ${rKo}`);
    }
  }
}

for (const e of p.errors) failures.push(e);
await b.close();
await close();
report('caminho do erro', failures);
