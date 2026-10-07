// Construtores de questões usados pelos arquivos de conteúdo dos capítulos.
// Cada questão tem: type ('choice' | 'input'), kind (como é desenhada na tela),
// a (resposta correta — string ou lista de respostas aceitas; a primeira é a canônica),
// why (explicação em português mostrada na correção) e rule (id da regra, preenchido depois).

/** Gênero de uma palavra: maschile / femminile. `ctx` é uma frase opcional de contexto. */
export const G = (w, g, why, ctx) => ({ type: 'choice', kind: 'gender', w, ctx, opts: ['m', 'f'], a: g, why });

/** Escreva o plural. */
export const PL = (w, a, why) => ({ type: 'input', kind: 'plural', w, a, why });

/** Escreva o singular. */
export const SG = (w, a, why) => ({ type: 'input', kind: 'singular', w, a, why });

/** Complete a terminação da palavra (radical + lacuna). `g` = 'm' | 'f' (dica). */
export const END = (stem, a, g, why) => ({ type: 'input', kind: 'ending', stem, a, g, why });

/** Complete a lacuna dentro de uma frase. */
export const FILL = (before, after, a, why) => ({ type: 'input', kind: 'fill', before, after, a, why });

/** Múltipla escolha livre. */
export const MC = (q, opts, a, why) => ({ type: 'choice', kind: 'mc', q, opts, a, why });

/** Atribui ids estáveis e a regra padrão às questões de um bloco. */
export function tag(questions, prefix, rule) {
  return questions.map((q, i) => ({ ...q, id: `${prefix}-${i + 1}`, rule: q.rule || rule }));
}

/** Atalho para marcar a regra de uma questão isolada. */
export const r = (rule, q) => ({ ...q, rule });
