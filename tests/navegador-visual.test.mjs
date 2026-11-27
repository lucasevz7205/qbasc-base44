import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  pontoNoArco, caminhoDoArco, posicaoNaBarra, intervaloNaBarra, tomDoIntervalo, variacao,
  contarSinais, dominioTendencia, escalaLinear, posicoesX, pontosTendencia, dataBR, diaMes,
} from '../src/lib/navegador-visual.js';
import { gerarRelatorio, expandirRelatorio, finishStats } from '../src/lib/navegador.js';

test('arco do medidor: 0 à esquerda, 0,5 no topo, 1 à direita, valores presos', () => {
  assert.deepEqual(pontoNoArco(100, 100, 80, 0), { x: 20, y: 100 });
  assert.deepEqual(pontoNoArco(100, 100, 80, 0.5), { x: 100, y: 20 });
  assert.deepEqual(pontoNoArco(100, 100, 80, 1), { x: 180, y: 100 });
  assert.deepEqual(pontoNoArco(100, 100, 80, 2), pontoNoArco(100, 100, 80, 1));
  assert.deepEqual(pontoNoArco(100, 100, 80, -1), pontoNoArco(100, 100, 80, 0));
  assert.equal(caminhoDoArco(100, 100, 80, 0, 1), 'M 20 100 A 80 80 0 0 1 180 100');
  assert.equal(caminhoDoArco(100, 100, 80, 1, 0), caminhoDoArco(100, 100, 80, 0, 1));
  assert.equal(caminhoDoArco(100, 100, 80, 0.4, 0.4), '');
});

test('barra de intervalo: posição, faixa e amostra pequena com faixa larga', () => {
  assert.equal(posicaoNaBarra(0.5), 50);
  assert.equal(posicaoNaBarra(1.4), 100);
  assert.equal(posicaoNaBarra(NaN), null);
  assert.equal(posicaoNaBarra(5, 0, 10), 50);
  const pequena = finishStats({ C: 3, E: 1, B: 0, causas: {} });
  const grande = finishStats({ C: 30, E: 10, B: 0, causas: {} });
  const a = intervaloNaBarra(pequena), b = intervaloNaBarra(grande);
  assert.equal(a.ponto, 75); assert.equal(b.ponto, 75);
  assert.ok(a.largura > b.largura);
  assert.ok(a.de <= a.ponto && a.ponto <= a.ate);
  assert.equal(intervaloNaBarra(finishStats({ C: 0, E: 0, B: 2, causas: {} })), null);
});

test('tom do intervalo em relação a 50%', () => {
  assert.equal(tomDoIntervalo({ low: 0.55, high: 0.8 }), 'correct');
  assert.equal(tomDoIntervalo({ low: 0.2, high: 0.45 }), 'incorrect');
  assert.equal(tomDoIntervalo({ low: 0.4, high: 0.6 }), 'attention');
  assert.equal(tomDoIntervalo(null), 'no-evidence');
});

test('variação com sentido de melhora', () => {
  assert.deepEqual(variacao(5, 2), { delta: 3, sentido: 'sobe', melhora: true, texto: '+3' });
  assert.deepEqual(variacao(1, 4, 'menor'), { delta: -3, sentido: 'desce', melhora: true, texto: '−3' });
  assert.equal(variacao(2, 2).melhora, null);
  assert.equal(variacao(2, 2).texto, '±0');
  assert.equal(variacao(9, 4, 'neutro').melhora, null);
  assert.equal(variacao(undefined, 2), null);
});

test('contagem por sinal ignora sinais desconhecidos', () => {
  assert.deepEqual(contarSinais([{ sinal: 'fraco' }, { sinal: 'fraco' }, { sinal: 'forte' }, { sinal: 'x' }]),
    { fraco: 2, 'sem-sinal': 0, forte: 1, insuficiente: 0 });
});

test('escala da tendência: inclui referência, amplitude mínima e mapeia pixels', () => {
  assert.deepEqual(dominioTendencia([3, 7], { incluir: [0] }), [0, 7]);
  assert.deepEqual(dominioTendencia([-4, 6], { incluir: [0] }), [-4, 6]);
  const [lo, hi] = dominioTendencia([5], { incluir: [5] });
  assert.equal(hi - lo, 4); assert.ok(lo <= 5 && hi >= 5);
  assert.deepEqual(dominioTendencia([]), [0, 4]);
  const y = escalaLinear([0, 10], [100, 0]);
  assert.equal(y(0), 100); assert.equal(y(10), 0); assert.equal(y(5), 50);
  assert.deepEqual(posicoesX(3, 0, 100), [0, 50, 100]);
  assert.deepEqual(posicoesX(1, 0, 100), [50]);
  assert.deepEqual(posicoesX(0, 0, 100), []);
});

const resposta = (data, itemId, resultado, topico = 'rf') => ({ data, itemId, topico, resultado, confianca: 2 });
test('pontos da tendência saem dos relatórios semanais, em ordem, sem os mensais', () => {
  const respostas = [
    resposta('2026-11-10T12:00:00Z', 'a', 'C'), resposta('2026-11-11T12:00:00Z', 'b', 'E'),
    resposta('2026-11-18T12:00:00Z', 'c', 'C'), resposta('2026-11-19T12:00:00Z', 'd', 'C'),
  ];
  const s1 = expandirRelatorio(gerarRelatorio({ respostas, today: '2026-11-14', tipo: 'semanal' }));
  const s2 = expandirRelatorio(gerarRelatorio({ respostas, today: '2026-11-21', tipo: 'semanal' }));
  const m = expandirRelatorio(gerarRelatorio({ respostas, today: '2026-11-21', tipo: 'mensal' }));
  const pontos = pontosTendencia([s2, m, s1]);
  assert.deepEqual(pontos.map(p => p.id), [s1.id, s2.id]);
  assert.equal(pontos[0].rotulo, '14/11');
  assert.equal(pontos[0].liquida, 0);
  assert.equal(pontos[1].liquida, 2);
  assert.ok(pontos[1].low <= pontos[1].acerto && pontos[1].acerto <= pontos[1].high);
  assert.deepEqual(pontosTendencia([]), []);
});

test('datas curtas', () => {
  assert.equal(dataBR('2026-11-27'), '27/11/2026');
  assert.equal(diaMes('2026-11-27'), '27/11');
  assert.equal(dataBR('x'), '');
});
