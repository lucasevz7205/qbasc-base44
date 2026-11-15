/* global URL */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applyEditorialOverlays, makeEditorialEntry, makeDirectQuestionOverwrite } from "../src/lib/editorial-overrides.js";

const raw = Object.freeze({
  id: "Q-99", enunciado: "Regra original.", gabarito: "C", comentario: "Explicação original.",
  ref: "Referência original", cap: "DA 10.3", mapaNoId: "DA::123", origem: "banca",
  foraNivel: false, mecanismo: "F1", tags: ["direito"],
});
const answered = Object.freeze({
  id: raw.id, statement: raw.enunciado, key: raw.gabarito,
  explanation: raw.comentario, basis: raw.ref, node: raw.mapaNoId, topicId: "da-10.3",
  origin: raw.origem, raw, response: Object.freeze({
    qid: raw.id, acertos: 1, erros: 2, ultimaMarcada: "E",
    hist: [{m:"C",ok:true,em:"2026-11-01T00:00:00Z"},
      {m:"E",ok:false,em:"2026-11-02T00:00:00Z"}],
  }),
});
const proposal = { parecer:"A regra estava ambígua.", replacement:{
  statement:"Regra revisada.", key:"E", explanation:"Comentário revisado.",
  basis:"Referência mantida",
}};
test("sobrescrita usa mesmo ID e mantém metadados, vínculo e histórico original", () => {
  const { backup, updatedQuestion } = makeDirectQuestionOverwrite({
    question:answered, proposal, issue:"gabarito", note:"corrigir", now:new Date("2026-11-15T15:00:00Z"),
  });
  assert.equal(updatedQuestion.id,raw.id);
  assert.equal(updatedQuestion.mapaNoId,raw.mapaNoId);
  assert.equal(updatedQuestion.cap,raw.cap);
  assert.equal(updatedQuestion.origem,raw.origem);
  assert.equal(updatedQuestion.mecanismo,raw.mecanismo);
  assert.equal(updatedQuestion.enunciado,"Regra revisada.");
  assert.equal(updatedQuestion.gabarito,"E");
  assert.equal(updatedQuestion.comentario,"Comentário revisado.");
  assert.equal(updatedQuestion.versaoCuradoriaDireta,1);
  assert.equal(backup.id,"question:Q-99:v1");
  assert.equal(backup.status,"sobrescrita");
  assert.deepEqual(backup.rawAnterior,raw);
  assert.equal(backup.exibidaAnterior.key,"C");
  assert.equal(answered.response.acertos,1);
  assert.equal(answered.response.erros,2);
  assert.equal(answered.response.hist[0].ok,true);
  assert.equal(raw.gabarito,"C");
});
test("versões editoriais anteriores não cobrem questão sobrescrita", () => {
  const editorial = makeEditorialEntry({
    kind:"question", content:answered, proposal:{...proposal, replacement:{...proposal.replacement,statement:"Outra versão editorial"}},
    issue:"formulacao",
  });
  const r = makeDirectQuestionOverwrite({question:answered, proposal, previous:editorial, issue:"gabarito"});
  assert.equal(r.backup.version,2);
  const replacedQuestion = {
    ...answered,
    raw:r.updatedQuestion,
    key:r.updatedQuestion.gabarito,
    statement:r.updatedQuestion.enunciado,
    explanation:r.updatedQuestion.comentario,
  };
  const result=applyEditorialOverlays([replacedQuestion],[],[editorial,r.backup]);
  assert.equal(result.questions[0].statement,"Regra revisada.");
  assert.equal(result.questions[0].key,"E");
});
test("nova curadoria futura pode aplicar versão posterior a sobrescrita", () => {
  const direct = makeDirectQuestionOverwrite({question:answered, proposal, issue:"gabarito"});
  const replaced = {
    ...answered,raw:direct.updatedQuestion,statement:direct.updatedQuestion.enunciado,
    key:direct.updatedQuestion.gabarito,
  };
  const next = makeEditorialEntry({
    kind:"question",content:replaced,previous:direct.backup,
    proposal:{parecer:"Nova revisão",replacement:{statement:"Texto terceira versão",key:"E",explanation:"Explicação",basis:"Fonte"}},
    issue:"formulacao",
  });
  const result = applyEditorialOverlays([replaced],[],[direct.backup,next]);
  assert.equal(next.version,2);
  assert.equal(result.questions[0].statement,"Texto terceira versão");
});
test("sobrescrita exige origem editável e proposta completa",()=>{
  assert.throws(()=>makeDirectQuestionOverwrite({
    question:{...answered,raw:null},proposal,issue:"gabarito",
  }),/registro original editável/);
  assert.throws(()=>makeDirectQuestionOverwrite({
    question:answered,proposal:{replacement:{statement:"",key:"C"}},issue:"gabarito",
  }),/incompleta/);
});
test("UI exige confirmação e salva backup ANTES de sobrescrever questão",()=>{
  const src=readFileSync(new URL("../src/components/qb/study/EditorialCurator.jsx",import.meta.url),"utf8");
  assert.match(src,/Salvar sobre a questão anterior/);
  assert.match(src,/open=\{confirmOverwrite\}/);
  assert.match(src,/Confirmar substituição/);
  const a=src.indexOf('await save("curadoria", backup.id, backup)');
  const b=src.indexOf('await save("questoes", item.id, updatedQuestion)');
  assert.ok(a>0 && b>a,"backup deve preceder escrita do original");
  assert.match(src,/isQuestion && \(/);
  assert.match(src,/\["aprovada", "sobrescrita"\]/);
  assert.doesNotMatch(src,/save\("respostas"/);
});
test("modelo de progresso preserva resultado histórico e identifica item reformulado",()=>{
  const src=readFileSync(new URL("../src/lib/qb-real-model.js",import.meta.url),"utf8");
  assert.match(src,/typeof lastAttempt\?\.ok === 'boolean'/);
  assert.match(src,/reformuladaPeloArquiteto/);
  assert.match(src,/versaoCuradoriaDireta/);
});
