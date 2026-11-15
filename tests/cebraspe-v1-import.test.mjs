/* global URL */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CEBRASPE_V1_TAXONOMY, CEBRASPE_V1_MNEMONICS, CEBRASPE_V1_STRATEGY, CEBRASPE_V1_CODES,
  CEBRASPE_V1_GENERATION_RULES, CEBRASPE_V1_TUTOR_RULES, mechanismForKey, mechanismDetail,
} from '../src/lib/cebraspe-v1-taxonomy.js';
import { mechanismPractice } from '../src/lib/cebraspe-v1-performance.js';
import { mechanismOptions, questionTrap } from '../src/lib/question-feedback.js';
import { normalizeGanConfrontation, CEBRASPE_MECHANISMS } from '../src/lib/mindmap-gan.js';

const data = JSON.parse(readFileSync(new URL('../src/data/pegadinhas-v1.json', import.meta.url), 'utf8'));
const textOf = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');

test('taxonomia original V1: exatamente F1–F10 V1–V4 e sentidos não conflitantes', () => {
  assert.equal(CEBRASPE_V1_CODES.length, 14);
  assert.deepEqual(CEBRASPE_V1_CODES, ['F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','V1','V2','V3','V4']);
  assert.equal(CEBRASPE_V1_TAXONOMY.F6.n, 'Relação lógica alterada');
  assert.equal(CEBRASPE_V1_TAXONOMY.F9.n, 'Composição');
  assert.equal(CEBRASPE_V1_TAXONOMY.F10.n, 'Reescrita');
  assert.equal(CEBRASPE_V1_TAXONOMY.V2.n, 'Incompleto não é errado');
  assert.equal(CEBRASPE_V1_TAXONOMY.V3.n, 'Alcance verdadeiro');
  assert.equal(CEBRASPE_MECHANISMS.F6, 'Relação lógica alterada');
  assert.equal(CEBRASPE_MECHANISMS.V2, 'Incompleto não é errado');
});
test('cada mecanismo preserva sinais, vacina, mnemônico e máxima adaptada da V1', () => {
  for(const code of CEBRASPE_V1_CODES) {
    for(const key of ['n','o','s','v']) assert.ok(CEBRASPE_V1_TAXONOMY[code][key]);
    for(const key of ['lema','pergunta','armadilha','acao']) assert.ok(CEBRASPE_V1_MNEMONICS[code][key]);
    for(const key of ['maxima','autor','principio','aplicacao']) assert.ok(CEBRASPE_V1_STRATEGY[code][key]);
    assert.equal(mechanismDetail(code).code, code);
  }
});
test('mecanismos falsos não são usados com C e vice-versa', () => {
  assert.equal(mechanismForKey('F6','E'), true);
  assert.equal(mechanismForKey('F6','C'), false);
  assert.equal(mechanismForKey('V3','C'), true);
  assert.equal(mechanismForKey('V3','E'), false);
  assert.equal(mechanismForKey('F99','E'), false);
  assert.equal(mechanismOptions('E').length, 10);
  assert.equal(mechanismOptions('C').length, 4);
});
test('instruções exigem evidência, versão correta e não inventar frequência', () => {
  assert.match(CEBRASPE_V1_GENERATION_RULES, /versão correta/);
  assert.match(CEBRASPE_V1_GENERATION_RULES, /Não invente mecanismo/);
  assert.match(CEBRASPE_V1_GENERATION_RULES, /F1/);
  assert.match(CEBRASPE_V1_TUTOR_RULES, /confiança/);
  assert.match(CEBRASPE_V1_TUTOR_RULES, /incidência/);
});
test('acervo original: 186 registros únicos, 80 classificados, 106 sem código; nenhum inventado', () => {
  assert.equal(data.length, 186);
  assert.equal(new Set(data.map(x=>x.id)).size, 186);
  assert.equal(data.filter(x=>x.mecanismo).length, 80);
  assert.equal(data.filter(x=>!x.mecanismo).length, 106);
  assert.ok(data.every(x=>x.id && x.armadilha && x.topico && x.ref));
  assert.ok(data.filter(x=>x.mecanismo).every(x=>CEBRASPE_V1_CODES.includes(x.mecanismo)));
});
test('conflito de classificação da Ascensão é sinalizado e não reclassificado silenciosamente', () => {
  const q=questionTrap({mecanismo:'F6',mecanismoNome:'Troca de natureza privativa/comum',comentario:'Texto'});
  assert.equal(q.code, undefined);
  assert.equal(q.legacyConflict, true);
  assert.match(q.name,/versão anterior/);
  const v1=questionTrap({mecanismo:'F6',mecanismoNome:'Relação lógica alterada'});
  assert.equal(v1.code,'F6');
  assert.match(v1.keyQuestion,/conector/);
});
test('desempenho do mecanismo usa histórico efetivo de respostas e confiança', () => {
  const sample=[
    {id:'q1',key:'E',subjectId:'da',trap:{code:'F6'},
      response:{ultimaMarcada:'C',gabaritoUsado:'E',conf:3,hist:[{m:'C',ok:false,c:3},{m:'C',ok:false,c:3}]}},
    {id:'q2',key:'E',subjectId:'da',trap:{code:'F6'},
      response:{ultimaMarcada:'E',gabaritoUsado:'E',conf:2,hist:[{m:'E',ok:true,c:2}]}},
    {id:'q3',key:'E',subjectId:'da',trap:{code:undefined,legacyConflict:true},response:{ultimaMarcada:'C'}},
    {id:'q4',key:'C',subjectId:'ti',trap:{code:'V1'}},
  ];
  const stats=mechanismPractice(sample, 'da');
  assert.deepEqual(stats.get('F6').questionIds,['q1','q2']);
  assert.equal(stats.get('F6').answered,2);
  assert.equal(stats.get('F6').wrong,1);
  assert.equal(stats.get('F6').highConfidenceErrors,1);
  assert.equal(stats.get('F6').repeatedErrors,1);
  assert.equal(stats.get('V1'),undefined);
});
test('GAN aceita código V1 válido e bloqueia incompatível em vez de inventar F3/V1', () => {
  const question={mapaNoId:'n1',enunciado:'Duas premissas corretas podem estar associadas por um nexo causal falso.',gabarito:'E',mecanismo:'F6',comentario:'Nexo não comprovado.',trechoDecisivo:'nexo causal'};
  const judge={index:0,gabaritoDiscriminador:'E',veredicto:'APROVADA',scoreRealismo:90};
  const map={nodes:[{id:'n1',label:'Relações lógicas'}]};
  const ok=normalizeGanConfrontation([question],[judge],map,{targetNodeId:'n1'});
  assert.equal(ok.aprovadas.length,1);
  assert.equal(ok.aprovadas[0].mecanismo,'F6');
  assert.equal(ok.aprovadas[0].mecanismoNome,'Relação lógica alterada');
  const bad=normalizeGanConfrontation([{...question,mecanismo:'V2'}],[judge],map,{targetNodeId:'n1'});
  assert.equal(bad.aprovadas.length,0);
  assert.equal(bad.bloqueadas.length,1);
  assert.match(bad.bloqueadas[0].falhasDetectadas.join(' '),/incompatível/);
});
test('Treinar disponibiliza laboratório e acervo sem sobrescrever questão ou progresso', () => {
  const screen=textOf('src/components/qb/screens/TrainScreen.jsx');
  const lab=textOf('src/components/qb/study/PegadinhasLab.jsx');
  const archive=textOf('src/components/qb/study/AcervoPegadinhasV1.jsx');
  const tutor=textOf('src/lib/server-fns.js');
  assert.match(screen, /<PegadinhasLab/);
  assert.match(screen, /<AcervoPegadinhasV1/);
  assert.match(lab, /mechanismPractice/);
  assert.match(lab, /questionIds/);
  assert.match(archive, /pegadinhas-v1\.json/);
  assert.match(archive, /Sem código/);
  assert.match(tutor, /CEBRASPE_V1_TUTOR_RULES/);
  assert.match(tutor, /CEBRASPE_V1_GENERATION_RULES/);
  assert.doesNotMatch(lab,/save\(/);
  assert.doesNotMatch(archive,/save\(/);
});
