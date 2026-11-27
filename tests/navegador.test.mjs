import assert from 'node:assert/strict';
import { test } from 'node:test';
import { navegadorExport, navegadorSemanal, navegadorTopicos, navegadorDisciplinas, gerarRelatorio, expandirRelatorio, referenciaDe, janelaDe, wilson } from '../src/lib/navegador.js';
import { orientacaoProva, orientacaoEstudo } from '../src/lib/navegador-orientacao.js';
const today = '2026-11-27';
const q = (id, topicId, origin, mecanismo) => ({id,topicId,origin,key:'C',raw:{mecanismo},statement:'não exportar',explanation:'não exportar'});
const qs = [q('a','rf','Inédito Cebraspe','F3'),q('b','rf','Cebraspe 2026'),q('c','pl','Cebraspe 2024')];
test('histórico e rodada não contam duas vezes; JSON só inclui campos permitidos', () => {
 const em = '2026-11-22T09:00:00-03:00';
 const tentativa = {qid:'a', em, marcada:'E', ok:false, c:3, texto:'privado'};
 const records = {respostas:[{qid:'a',hist:[{em,m:'E',ok:false,c:3,sessionId:'s'}],email:'privado'}],
  rodadas:[{id:'qbasc-s',inicio:em,fim:em,certos:0,errados:1,itens:[tentativa]}]};
 const before=JSON.stringify(records);
 const result=navegadorExport(records,qs,today);
 assert.equal(JSON.stringify(records),before);
 assert.deepEqual(result.respostas,[{data:'2026-11-22T12:00:00.000Z',itemId:'a',topico:'rf',resultado:'E',confianca:3,origem:'inédito',mecanismo:'F3'}]);
 const week=navegadorSemanal(result.respostas,today);
 assert.equal(week.atual.liquida,-1);
 assert.deepEqual(week.priorities,[{topico:'rf',erros:1,certeza:1}]);
});
test('ordem histórica, recorte de Brasília e repetições, incluindo branco', () => {
 const registros={respostas:[
  {qid:'a',hist:[{em:'2026-11-01T10:00:00Z',m:'B'},{em:'2026-11-24T10:00:00Z',m:'C'}]},
  {qid:'b',hist:[{em:'2026-11-20T02:59:59Z',m:'C'}]},
  {qid:'c',hist:[{em:'2026-11-20T03:00:00Z',m:'B'},{em:'2026-11-27T03:00:00Z',m:'C'}]},
 ]};
 const exportado=navegadorExport(registros,qs,today);
 const week=navegadorSemanal(exportado.respostas,today);
 assert.equal(week.anterior.C,1); assert.equal(week.atual.B,1); assert.equal(week.atual.C,0); assert.equal(week.repetidas,1);
 assert.deepEqual(week.priorities,[]);
});
test('não inventa horário, tópico, origem nem detalhe de rodadas agregadas', () => {
 const registros={respostas:[{qid:'a',hist:[{em:'2026-11-22',m:'E'}]}],
  rodadas:[{id:'legado',fim:'2026-11-24',certos:2,errados:3}]};
 const x=navegadorExport(registros,qs,today);
 assert.deepEqual(x.respostas,[]);
 assert.deepEqual(x.limites,{itensSemOrdemConfirmada:1,tentativasApenasEmTotais:5,tentativasSemData:0,tentativasSemHorario:0,simuladoSemGabarito:0});
});

// E1: taxa, chance de acerto, exclusões visíveis, simulado com rótulo próprio.
const rows = (topico, erros, total, extra = {}) => Array.from({length: total}, (_, i) => ({
  data:'2026-11-24T12:00:00.000Z', itemId: topico + i, topico, resultado: i < erros ? 'E' : 'C', confianca: 3, ...extra }));
test('taxa e denominador distinguem 4 erros em 40 de 2 em 3', () => {
 const t = navegadorTopicos([...rows('A',4,40), ...rows('B',2,3)], today);
 const a = t.topicos.find(x => x.topico === 'A'), b = t.topicos.find(x => x.topico === 'B');
 assert.equal(a.validas,40); assert.equal(a.taxaErro,0.1); assert.equal(b.taxaErro,2/3);
 assert.equal(a.sinal,'forte'); assert.equal(b.sinal,'insuficiente');
 assert.ok(b.intervaloAcerto.high - b.intervaloAcerto.low > a.intervaloAcerto.high - a.intervaloAcerto.low);
 assert.equal(t.topicos[0].topico,'B');
});
test('Wilson: valores de referência e amostra vazia', () => {
 const w = wilson(36, 40);
 assert.ok(Math.abs(w.low - 0.769) < 0.005 && Math.abs(w.high - 0.960) < 0.005);
 assert.equal(wilson(0, 0), null);
});
test('ponto fraco exige amostra mínima e taxa de erro acima da geral', () => {
 const t = navegadorTopicos([...rows('F',9,10), ...rows('G',0,40)], today);
 assert.equal(t.topicos.find(x => x.topico === 'F').sinal,'fraco');
 assert.equal(t.topicos.find(x => x.topico === 'G').sinal,'forte');
 const pouco = navegadorTopicos(rows('H',7,7), today);
 assert.equal(pouco.topicos[0].sinal,'insuficiente');
});
test('brancos e confiança ausente: fora da taxa, contados à parte; sem-tópico fica fora da tabela', () => {
 const base = [
  {data:'2026-11-24T12:00:00.000Z',itemId:'1',topico:'T',resultado:'B'},
  {data:'2026-11-24T12:00:00.000Z',itemId:'2',topico:'T',resultado:'E'},
  {data:'2026-11-24T12:00:00.000Z',itemId:'3',topico:'T',resultado:'C',confianca:2},
  {data:'2026-11-24T12:00:00.000Z',itemId:'4',topico:'sem-tópico',resultado:'E',confianca:3},
 ];
 const t = navegadorTopicos(base, today);
 const x = t.topicos[0];
 assert.equal(t.topicos.length,1); assert.equal(t.semTopico,1);
 assert.equal(x.validas,2); assert.equal(x.B,1); assert.equal(x.taxaErro,0.5); assert.equal(x.semConfianca,1);
 assert.equal(t.calibracao[2].n,1); assert.equal(t.calibracao[2].amostraPequena,true);
});
test('simulado entra com rótulo próprio e sem tocar nos registros', () => {
 const registros = {respostas:[], simulados:[
  {tipo:'obj',data:'2026-11-23',inicio:'2026-11-23T13:00:00.000Z',itens:[
   {qid:'a',gabarito:'C',marcada:'E'},{qid:'b',gabarito:'C',marcada:''},{qid:'c',gabarito:'',marcada:'C'}]},
  {tipo:'disc',data:'2026-11-23',itens:[{texto:'privado'}]}]};
 const before = JSON.stringify(registros);
 const x = navegadorExport(registros, qs, today);
 assert.equal(JSON.stringify(registros), before);
 assert.equal(x.respostas.length, 3);
 assert.ok(x.respostas.every(r => r.contexto === 'simulado' && r.confianca === undefined));
 assert.deepEqual(x.respostas.map(r => r.resultado).sort(), ['B','C','E']);
 const week = navegadorSemanal(x.respostas, today);
 assert.equal(week.atual.contextos.simulado.n, 3); assert.equal(week.atual.contextos.treino.n, 0);
 assert.equal(JSON.stringify(x).includes('privado'), false);
});
test('exclusões antes silenciosas agora são contadas', () => {
 const registros = {respostas:[
  {qid:'a',hist:[{m:'E'}]},
  {qid:'b',hist:[{em:'2026-11-20T10:00:00Z',m:'E'},{em:'2026-11-25',m:'C'}]}]};
 const x = navegadorExport(registros, qs, today);
 assert.equal(x.limites.tentativasSemData,1); assert.equal(x.limites.tentativasSemHorario,1);
 assert.equal(x.respostas.length,1);
});
test('origem "Não oficial" não vira oficial', () => {
 const registros = {respostas:[{qid:'a',hist:[{em:'2026-11-24T10:00:00Z',m:'C'}]}]};
 const x = navegadorExport(registros, [q('a','rf','Material não oficial')], today);
 assert.equal(x.respostas[0].origem, undefined);
});

// E2, E3, E4, E5 e relatórios salvos.
test('causa marcada pelo estudante entra no JSON como um dos quatro códigos, sem o texto', () => {
 const em = '2026-11-22T09:00:00-03:00';
 const registros = {respostas:[{qid:'a',hist:[{em,m:'E',ok:false,c:3}]}],
  justificativas:[{id:'j',qid:'a',tentativaEm:em,origem:'interferencia',texto:'segredo'},{id:'k',qid:'a',tentativaEm:'2026-01-01T00:00:00Z',origem:'leitura',texto:'x'}]};
 const x = navegadorExport(registros, qs, today);
 assert.equal(x.respostas[0].causa,'interferencia');
 assert.equal(JSON.stringify(x).includes('segredo'),false);
 const invalida = navegadorExport({respostas:registros.respostas,justificativas:[{qid:'a',tentativaEm:em,origem:'outra'}]}, qs, today);
 assert.equal(invalida.respostas[0].causa, undefined);
});
const comCausa = (topico, causas, extra = 0) => [...causas.map((causa, i) => ({data:'2026-11-24T12:00:00.000Z',itemId:topico+'e'+i,topico,resultado:'E',causa})),
 ...Array.from({length:extra},(_, i)=>({data:'2026-11-24T12:00:00.000Z',itemId:topico+'c'+i,topico,resultado:'C'}))];
test('estudo segue a causa dominante; sem causa suficiente não adivinha', () => {
 const t = causa => navegadorTopicos(comCausa('T',causa,6),today).topicos[0];
 assert.equal(orientacaoEstudo(t(['recuperacao','recuperacao'])).metodo,'flashcards');
 assert.equal(orientacaoEstudo(t(['compreensao','compreensao','leitura'])).metodo,'feynman');
 assert.equal(orientacaoEstudo(t(['interferencia','interferencia'])).metodo,'contraste');
 assert.equal(orientacaoEstudo(t(['leitura','leitura'])).metodo,'leitura');
 assert.equal(orientacaoEstudo(t(['recuperacao','leitura'])).metodo,'registrar-causa');
 assert.equal(orientacaoEstudo(t([])), null);
});
test('prova: marcar, chutar ou branco pelo intervalo da chance de acerto', () => {
 const top = (erros,total) => navegadorTopicos(rows('X',erros,total),today).topicos[0];
 assert.equal(orientacaoProva(top(1,40)).acao,'marcar');
 assert.equal(orientacaoProva(top(30,40)).acao,'branco');
 assert.equal(orientacaoProva(top(20,40)).acao,'chutar');
 assert.equal(orientacaoProva(top(22,40)).acao,'branco');
 assert.match(orientacaoProva(top(22,40)).titulo,/Prefira/);
 const poucos = orientacaoProva(top(1,5));
 assert.equal(poucos.acao,'sem-dados'); assert.match(poucos.texto,/Faltam 3/);
 assert.match(orientacaoProva(top(1,12)).texto,/provisória/);
});
test('matéria agrega tópicos do edital e declara amostra insuficiente', () => {
 const subjects = [{id:'s1',name:'Matéria 1',short:'M1',topics:[{id:'A'},{id:'B'}]},{id:'s2',name:'Matéria 2',short:'M2',topics:[{id:'C'}]}];
 const t = navegadorTopicos([...rows('A',2,20),...rows('B',2,20),...rows('C',9,10)],today);
 const d = navegadorDisciplinas(t,subjects);
 const m1 = d.find(x=>x.id==='s1'), m2 = d.find(x=>x.id==='s2');
 assert.equal(m1.validas,40); assert.equal(m1.E,4); assert.equal(m1.topicos,2);
 assert.equal(m2.sinal,'insuficiente');
});
test('datas de referência: sábado semanal e dia 1 mensal', () => {
 assert.equal(referenciaDe('2026-11-28'),'2026-11-28');
 assert.equal(referenciaDe('2026-11-29'),'2026-11-28');
 assert.equal(referenciaDe('2026-12-04'),'2026-11-28');
 assert.equal(referenciaDe('2026-12-03','mensal'),'2026-12-01');
 assert.deepEqual(janelaDe('2026-12-01','mensal'),{start:'2026-10-01',cut:'2026-11-01',end:'2026-12-01'});
 assert.deepEqual(janelaDe('2027-01-01','mensal'),{start:'2026-11-01',cut:'2026-12-01',end:'2027-01-01'});
});
test('relatório salvo é compacto, sem texto, e se reconstrói ao exibir', () => {
 const respostas = [...rows('A',4,40),...comCausa('B',['recuperacao','recuperacao'],6)];
 const doc = gerarRelatorio({respostas,today:'2026-11-29',tipo:'semanal'});
 assert.equal(doc.id,'semanal-2026-11-28'); assert.equal(doc.referencia,'2026-11-28');
 assert.equal(doc.periodo.de,'2026-11-14'); assert.equal(doc.periodo.ate,'2026-11-27');
 assert.ok(JSON.stringify(doc).length < 3000);
 const rel = expandirRelatorio(JSON.parse(JSON.stringify(doc)),[]);
 const b = rel.topicos.find(t=>t.topico==='B');
 assert.equal(b.causaDominante,'recuperacao'); assert.equal(rel.comparacao.conclusivo,false);
 assert.equal(rel.geral.E,6);
});
test('relatório mensal usa o mês anterior completo', () => {
 const r = (itemId,data,resultado)=>({itemId,data,resultado,topico:'T'});
 const doc = gerarRelatorio({respostas:[r('a','2026-11-10T12:00:00Z','E'),r('b','2026-10-10T12:00:00Z','C'),r('c','2026-12-01T12:00:00Z','C')],today:'2026-12-01',tipo:'mensal'});
 assert.equal(doc.id,'mensal-2026-12-01'); assert.equal(doc.placar.atual.E,1); assert.equal(doc.placar.anterior.C,1);
 assert.equal(doc.periodo.de,'2026-10-01'); assert.equal(doc.periodo.ate,'2026-11-30');
});
