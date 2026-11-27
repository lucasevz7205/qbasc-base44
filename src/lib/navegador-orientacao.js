import { MIN_RESPOSTAS_TOPICO, MIN_RESPOSTAS_CONFIANCA } from './navegador.js';

const pct = value => Math.round(value * 100);

/** Chance estimada de acerto se o assunto cair na prova, com o intervalo que a sustenta. */
export function chanceDeAcerto(stats) {
  if (!stats.validas || !stats.intervaloAcerto) return null;
  return { valor: pct(stats.acerto), min: pct(stats.intervaloAcerto.low), max: pct(stats.intervaloAcerto.high), respostas: stats.validas };
}

/** Marcar, chutar ou deixar em branco. Na nota líquida (C − E) um erro anula um acerto, então o ponto de equilíbrio é 50%. */
export function orientacaoProva(stats) {
  const chance = chanceDeAcerto(stats);
  if (stats.validas < MIN_RESPOSTAS_TOPICO || !chance) {
    return { acao: 'sem-dados', titulo: 'Sem dados para decidir', chance,
      texto: 'Faltam ' + Math.max(1, MIN_RESPOSTAS_TOPICO - stats.validas) + ' respostas válidas (acertos e erros) neste assunto.' };
  }
  const provisoria = stats.validas < MIN_RESPOSTAS_CONFIANCA ? ' Orientação provisória: menos de ' + MIN_RESPOSTAS_CONFIANCA + ' respostas.' : '';
  const { low, high } = stats.intervaloAcerto;
  if (low > 0.5) return { acao: 'marcar', titulo: 'Marque', chance,
    texto: 'Mesmo no pior cenário do intervalo, você acerta mais do que erra neste assunto.' + provisoria };
  if (high < 0.5) return { acao: 'branco', titulo: 'Deixe em branco', chance,
    texto: 'A chance de acerto está abaixo de 50%, e na nota líquida um erro anula um acerto.' + provisoria };
  if (stats.acerto < 0.5) return { acao: 'branco', titulo: 'Prefira deixar em branco', chance,
    texto: 'A estimativa está abaixo de 50%, embora o intervalo ainda inclua 50%. Só marque se conseguir eliminar a assertiva com segurança.' + provisoria };
  return { acao: 'chutar', titulo: 'Chute se tiver palpite', chance,
    texto: 'O intervalo inclui 50%, mas a estimativa está no ponto de equilíbrio ou acima: o chute tem ganho esperado perto de zero ou positivo.' + provisoria };
}

const ESTUDO = {
  recuperacao: { metodo: 'flashcards', titulo: 'Estude mais pelos flashcards',
    texto: 'Os erros vêm de não lembrar a regra. Evoque de memória, confira e volte a evocar em revisão espaçada.' },
  compreensao: { metodo: 'feynman', titulo: 'Estude mais pelo método Feynman',
    texto: 'Os erros vêm de entender a regra de forma errada. Explique com suas palavras, dê exemplo e contraexemplo e aplique em um caso novo.' },
  interferencia: { metodo: 'contraste', titulo: 'Estude por contraste',
    texto: 'Os erros vêm de confundir regras próximas. Escreva a diferença decisiva, crie um cartão de contraste e alterne as duas regras nas questões.' },
  leitura: { metodo: 'leitura', titulo: 'Treine a leitura da assertiva',
    texto: 'Os erros vêm de leitura apressada. Marque o trecho que decide o gabarito antes de julgar.' },
};
export const NOMES_CAUSA = { recuperacao: 'Não lembrei', interferencia: 'Confundi com outra regra', leitura: 'Li rápido demais', compreensao: 'Não entendi o conceito' };

/** Método de estudo a partir da causa que o próprio estudante marcou ao errar. Sem causa registrada, não adivinha. */
export function orientacaoEstudo(stats) {
  if (!stats.E) return null;
  const reavaliar = ' Reavalie com questões novas do mesmo assunto em 7 dias.';
  const causa = ESTUDO[stats.causaDominante];
  if (causa) return { ...causa, causa: stats.causaDominante, texto: causa.texto + reavaliar };
  return { metodo: 'registrar-causa', causa: 'indeterminada', titulo: 'Registre a causa ao errar',
    texto: 'Ainda não há justificativas suficientes para escolher o método. Marque a origem de cada erro.' };
}
