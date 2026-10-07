// Roteiro do curso, seguindo o índice de "Grammatica in contesto".
// Capítulos com `module` já estão disponíveis; os demais aparecem como "em breve".
import capitolo1 from './capitolo1.js';
import capitolo2 from './capitolo2.js';
import capitolo3 from './capitolo3.js';
import capitolo4 from './capitolo4.js';
import capitolo5 from './capitolo5.js';
import capitolo6 from './capitolo6.js';
import capitolo7 from './capitolo7.js';

/**
 * Um capítulo pode ser dividido em partes (cada uma com seu placar e histórico).
 * Quem não tem `parts` vira uma parte única, para o app ter um só caminho.
 * `rules` e `book` continuam reunindo tudo do capítulo.
 */
function normalize(mod) {
  const parts = mod.parts || [{ id: 'u', num: 1, title: mod.subtitle, pt: mod.pt, rules: mod.rules, book: mod.book }];
  return { ...mod, parts, rules: parts.flatMap((p) => p.rules), book: parts.flatMap((p) => p.book) };
}

export const modules = {
  1: normalize(capitolo1), 2: normalize(capitolo2), 3: normalize(capitolo3),
  4: normalize(capitolo4), 5: normalize(capitolo5), 6: normalize(capitolo6),
  7: normalize(capitolo7),
};

export const curriculum = [
  { id: 1, title: 'Nomi', subtitle: 'Genere e numero', area: 'Cibi e bevande', emoji: '🍝' },
  { id: 2, title: 'Articoli', subtitle: 'Determinativi e indeterminativi', area: 'Abitazioni e ambienti della casa', emoji: '🏠' },
  { id: 3, title: 'Aggettivi', subtitle: 'Concordanza', area: 'Abbigliamento', emoji: '👗' },
  { id: 4, title: 'Essere e avere', subtitle: 'Indicativo presente', area: 'Informazioni personali', emoji: '🙋' },
  { id: 5, title: 'Indicativo presente', subtitle: 'Verbi regolari e irregolari', area: 'Lavoro', emoji: '💼' },
  { id: 6, title: 'Possessivi', subtitle: 'Aggettivi e pronomi', area: 'Amici e parenti', emoji: '👨‍👩‍👧' },
  { id: 7, title: 'Interrogativi', subtitle: 'Fare domande', area: 'Trasporti', emoji: '🚆' },
  { id: 8, title: 'Verbi riflessivi', subtitle: 'E pronominali', area: 'Routine', emoji: '⏰' },
  { id: 9, title: 'Preposizioni', subtitle: 'E avverbi', area: 'Vita in città', emoji: '🏙️' },
  { id: 10, title: 'Verbo piacere', subtitle: 'Gusti e preferenze', area: 'Tempo libero', emoji: '🎭' },
  { id: 11, title: 'Passato prossimo', subtitle: 'Indicativo', area: 'Tempo cronologico', emoji: '📅' },
  { id: 12, title: 'Imperfetto', subtitle: 'Indicativo', area: 'Stati d\'animo', emoji: '🎞️' },
  { id: 13, title: 'Futuro', subtitle: 'Indicativo', area: 'Viaggi e vacanze', emoji: '✈️' },
  { id: 14, title: 'Pronomi diretti', subtitle: 'Lo, la, li, le…', area: '', emoji: '🎯' },
  { id: 15, title: 'Pronomi indiretti', subtitle: 'Gli, le…', area: '', emoji: '🎁' },
  { id: 16, title: 'Pronomi ne e ci', subtitle: '', area: '', emoji: '🧩' },
  { id: 17, title: 'Imperativo', subtitle: '', area: '', emoji: '📣' },
  { id: 18, title: 'Pronomi relativi', subtitle: '', area: '', emoji: '🔗' },
];
