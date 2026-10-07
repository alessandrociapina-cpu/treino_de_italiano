// Roteiro do curso, seguindo o índice de "Grammatica in contesto".
// Capítulos com `module` já estão disponíveis; os demais aparecem como "em breve".
import capitolo1 from './capitolo1.js';
import capitolo2 from './capitolo2.js';

export const modules = { 1: capitolo1, 2: capitolo2 };

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
