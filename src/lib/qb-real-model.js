import { applyEditorialOverlays } from '@/lib/editorial-overrides';
import { questionTrap } from '@/lib/question-feedback';

const arr = x => Array.isArray(x) ? x : [];
const str = x => Array.isArray(x) ? x.map(str).filter(Boolean).join('\n') : typeof x === 'string' ? x : '';
const firstText = (...values) => values.map(str).find(value => value.trim()) || '';

function nodeConcept(node, mapSources) {
  const detail = node.x && typeof node.x === 'object' && !Array.isArray(node.x) ? node.x : {};
  const sourceInputs = [detail.src, node.src, ...arr(mapSources)].flat();
  const sources = sourceInputs.map(source => ({
    label: firstText(source?.titulo, source?.label, source),
    url: typeof source?.url === 'string' && /^https?:\/\//i.test(source.url) ? source.url : undefined,
  })).filter(source => source.label);
  return {
    summary: firstText(detail.e, detail.explicacao, detail.definicao, node.x, node.explicacao, node.definicao, node.n),
    example: firstText(detail.ex, detail.exemplo, node.ex, node.exemplo),
    trap: firstText(detail.trap, detail.pegadinha, node.trap, node.pegadinha),
    sources: [...new Map(sources.map(source => [source.label, source])).values()],
  };
}

const num = x => Number.isFinite(Number(x)) ? Number(x) : 0;
const day = value => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (!value || !Number.isFinite(new Date(value).getTime())) return '';
  return new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Sao_Paulo'}).format(new Date(value));
};
const shift = (d,n) => { const date = new Date(d+'T12:00:00Z'); date.setUTCDate(date.getUTCDate()+n); return date.toISOString().slice(0,10); };
const explicitStatus = (v) => ({nao:'not-started', 'nao iniciado':'not-started', 'not-started':'not-started', studying:'studying', reviewing:'reviewing', mastered:'mastered', revisao:'reviewing',dominado:'mastered', revisando:'reviewing', revisado:'reviewing', estudado:'studying', estudo:'studying', 'em estudo':'studying', em_estudo:'studying', estudando:'studying', concluido:'mastered', concluida:'mastered'})[String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()];
const icons = {lp:'feather',li:'globe',da:'building-2',dc:'landmark',ti:'database',lg:'languages',rf:'audio-lines',pl:'scroll-text',cp:'vote'};
const blocks = {P1:'Conhecimentos básicos',P2:'Conhecimentos específicos'};
const zero = () => ({correct:0,wrong:0,blank:0});
const keyOf = x => String(x??'').trim().toUpperCase();
const chapterKey = x => keyOf(x);
export { day as studyDate };
export function adaptStudy(records, user, now = new Date()) {
  const today = day(now);
  const source = key => arr(records[key]);
  const topics = Object.create(null), subjects = Object.create(null), capTopic = Object.create(null);
  const progress = Object.create(null);
  for (const e of [...source('edital')].sort((a,b)=>num(a.materiaOrdem)-num(b.materiaOrdem)||num(a.ordem)-num(b.ordem))) {
    if(!e.id || !e.materia) continue;
    const subjectId = String(e.sigla || e.id.split('-')[0]).toLowerCase();
    const subject = subjects[subjectId] ??= {id:subjectId,name:e.materia,short:e.sigla||subjectId,block:e.prova,blockLabel:blocks[e.prova],icon:icons[subjectId]||'book-open',topics:[]};
    const t = {id:e.id,subjectId,num:String(e.num??''),title:e.titulo,known:!!e.titulo,status:'not-started',foraEdital:!!e.foraEdital,...zero()};
    topics[t.id]=t;
    progress[t.id]={manual:explicitStatus(e.status),tutory:e.tutoryIgnorar?null:e.tutory,answered:0,latestCorrect:0,errorsNotebook:0,retained:0};
    t.resources={questions:0,maps:[],cards:0,revision:[],materials:[]};
    subject.topics.push(t);
    for(const cap of arr(e.caps)) if(!capTopic[chapterKey(cap)]) capTopic[chapterKey(cap)]=t;
  }
  for(const material of source('materiais')){
    for(const id of new Set(arr(material.topicos))) topics[id]?.resources.materials.push(material);
  }
  const pointLists = Object.fromEntries(source('pontos').map(p=>[p.topico||p.id,arr(p.itens)]));
  const answers = Object.fromEntries(source('respostas').map(r=>[r.qid??r.id,r]));
  const rawQuestions = Object.fromEntries(source('questoes').map(q=>[q.id,q]));
  const excludedQuestionIds = new Set(source('questoes_excluidas').map(q=>q.id));
  const mapNodes=[], mindMaps=[], concepts={}, flashcards=[], roots={}, aliases={}, mapByTopic=Object.create(null);
  const questionNodeLinks = new Map();
  for(const d of source('revisao')){
    const topicId = d.topico || String(d.id).replace(/\.(mapa|cartoes)$/,'');
    const topic=topics[topicId];
    if(topic)topic.resources.revision.push(...arr(d.itens));
    const map=d.mapa || d.root;
    const branch=arr(map?.ramos??map?.children??map?.nos);
    if(map && (branch.length || map.centro)){
      const existingMap = mapByTopic[topicId];
      const root = existingMap ? existingMap.id : topicId+'::'+d.id;
      const title = existingMap ? existingMap.title : (str(map.centro??map.titulo??map.t)||topics[topicId]?.title||topicId);
      const nodes = existingMap ? existingMap.nodes : [];
      const add=(v,parent,path)=>{
        if(!v || typeof v!=='object')return;
        const id=parent?root+'::'+path:root;
        const label=str(v.t??v.label??v.titulo??v.rotulo)||title;
        nodes.push({id,parent,label});
        concepts[id] = nodeConcept(v, d.fontes);
        for (const qid of new Set([...arr(v.questaoIds), ...arr(v.x?.questaoIds)])) {
          if (typeof qid !== 'string') continue;
          if (!questionNodeLinks.has(qid)) questionNodeLinks.set(qid, []);
          questionNodeLinks.get(qid).push({ id, topicId });
        }
        if(v.id)(aliases[topicId]??={})[v.id]=id;
        arr(v.ramos??v.children??v.nos??v.filhos??v.sub??v.f).forEach((n,i)=>add(n,id,path+'.'+i));
      };
      if (existingMap) {
        const startIdx = nodes.filter(n => n.parent === root).length;
        const beforeLen = nodes.length;
        branch.forEach((n, i) => add(n, root, `0.${startIdx + i}`));
        (aliases[topicId] ??= {})[d.id] = root;
        mapNodes.push(...nodes.slice(beforeLen));
      } else {
        add({...map,t:title,ramos:branch},null,'0');
        roots[topicId] ??= root;
        const subjectId = topic?.subjectId || String(topicId).split('-')[0].toLowerCase();
        const subjectName = subjects[subjectId]?.name || str(d.materia) || 'Matéria';
        const mapEntry = {id:root,topicId,subjectId,subjectName,topicNum:topic?.num||'',topicTitle:topic?.title||title,title,nodes};
        mapByTopic[topicId] = mapEntry;
        mindMaps.push(mapEntry);
        if(topic) topic.resources.maps.push({id:root,title});
        mapNodes.push(...nodes);
      }
    }
    arr(d.cartoes??d.cards).forEach((c,i)=>{
      const front=str(c.q??c.frente??c.front??c.pergunta),back=str(c.a??c.verso??c.back??c.resposta);
      if(front&&back)flashcards.push({id:c.id||topicId+'@'+i,topicId,front,back,basis:str(c.src??c.ref??c.fonte),nodeRef:c.mapaNoId??c.no??c.node??c.mapaNo});
    });
  }
  const uniqueCards=[...new Map(flashcards.map(c=>[c.id,c])).values()];
  for(const card of uniqueCards){
    card.node=aliases[card.topicId]?.[card.nodeRef]||roots[card.topicId];
    if(topics[card.topicId]) topics[card.topicId].resources.cards++;
  }
  const isRetained = r => {
    if(r.retidoEm)return true;
    const history=arr(r.hist), first=day(r.primeiraEm||history[0]?.em);
    return Boolean(first&&history.some(e=>e.ok&&e.c!==1&&day(e.em)>=shift(first,7)));
  };
  const legacyAnalysis = source('analise').find(row => row.id === 'CONTROLE');
  const mechanisms = new Map(arr(legacyAnalysis?.itens).filter(item=>typeof item?.item==='string' && item.mecanismo).map(item=>[item.item,item]));
  const questionBank=[];
  const questionTotals=Object.create(null);
  for(const q of Object.values(rawQuestions)){
    const topic=topics[q.topico??q.topicId] || capTopic[chapterKey(q.cap)];
    const r=answers[q.id];

    if(!['C','E'].includes(keyOf(q.gabarito))||!q.enunciado||q.statusConfronto==='divergencia_bloqueada')continue;
    if(topic){
      if(!excludedQuestionIds.has(q.id)) topic.resources.questions++;
      const isTracked = !q.foraNivel&&!/^SIM/i.test(String(q.cap||''));
      if(isTracked)questionTotals[topic.id]=(questionTotals[topic.id]||0)+1;
      if(r&&isTracked){
        topic.correct+=num(r.acertos);
        topic.wrong+=num(r.erros);
        topic.blank+=num(r.brancos);
        if(num(r.tentativas)||num(r.acertos)||num(r.erros)||num(r.brancos)){
          const p=progress[topic.id];
          p.answered++;
          // Conserve a avaliação histórica mesmo quando a chave da questão é corrigida depois.
          const lastAttempt = arr(r.hist).at(-1);
          if(typeof lastAttempt?.ok === 'boolean' ? lastAttempt.ok : keyOf(r.ultimaMarcada)===keyOf(r.gabaritoUsado || q.gabarito))p.latestCorrect++;
          if(r.noCaderno)p.errorsNotebook++;
          if(isRetained(r))p.retained++;
        }
      }
    }
    const rawNodeRef = q.mapaNoId??q.no??q.node??q.mapaNo;
    const exactNode = mapNodes.some(n=>n.id===rawNodeRef) ? rawNodeRef : aliases[topic?.id]?.[rawNodeRef];
    const referencedNodes = questionNodeLinks.get(q.id)?.filter(link => link.topicId === topic?.id) || [];
    const uniqueReferences = [...new Set(referencedNodes.map(link => link.id))];
    const resolvedNode = exactNode || (uniqueReferences.length === 1 ? uniqueReferences[0] : roots[topic?.id]);
    const trap = questionTrap(q, mechanisms.get(q.id));
    const tags = Array.isArray(q.tags)&&q.tags.length ? q.tags : [q.tema||q.capNome, q.mecanismo ? `${q.mecanismo}${q.mecanismoNome ? ' · ' + q.mecanismoNome : ''}` : null].filter(Boolean);
    questionBank.push({id:q.id,code:q.code||q.id,year:q.ano,tags,key:keyOf(q.gabarito),statement:q.enunciado,explanation:firstText(q.comentario,q.justificativa,q.explicacao),basis:str(q.ref),trap,origin:q.origem,topicId:topic?.id,subjectId:topic?.subjectId,subject:subjects[topic?.subjectId]?.name,chapter:q.capNome||q.cap,node:resolvedNode,response:r,raw:q,editorial:q.reformuladaPeloArquiteto?{version:num(q.versaoCuradoriaDireta),status:'sobrescrita',editedAt:q.curadoriaDiretaEm}:undefined});
  }
  // Curadoria só muda a apresentação/futuras tentativas. Histórico acima continua intacto.
  const curated = applyEditorialOverlays(questionBank, uniqueCards, source('curadoria'));
  const activeQuestions = curated.questions.filter(q=>!excludedQuestionIds.has(q.id));
  const statusRank={'not-started':0,studying:1,reviewing:2,mastered:3};
  for(const t of Object.values(topics)){
    const b=t.resources, p=progress[t.id], tutory=p.tutory;
    if(!b.revision.length) b.revision.push(...(pointLists[t.id]||[]));
    const hasContent=b.maps.length||b.cards||b.revision.length||b.materials.some(x=>['mapa','material','cobertura'].includes(x.tipo));
    // Shared chapters are assigned only once unless a question explicitly names its topic.
    const accountable=questionTotals[t.id]||0;
    let effective=hasContent||accountable?'studying':'not-started';
    if(accountable && p.answered/accountable>=0.8){
      effective=p.latestCorrect/p.answered>=0.85&&!p.errorsNotebook&&p.retained>=p.answered?'mastered':'reviewing';
    }
    if(num(tutory?.revisao)>0&&num(tutory?.exercicio)>0&&statusRank[effective]<2)effective='reviewing';
    else if(effective==='not-started'&&['estudo','resumo','revisao','exercicio'].some(k=>num(tutory?.[k])>0))effective='studying';
    t.status=p.manual??effective;
    t.questionsAnswered=p.answered;
  }
  const reviews=Object.fromEntries(source('cartoes_aval').map(r=>[r.id,r]));
  const weeks={ '-1':[],0:[],1:[]}, weekday=['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
  const weekStart=offset=>shift(today,offset*7-new Date(today+'T12:00:00Z').getUTCDay());
  const tasks=source('planejamento').filter(x=>day(x.data)).map(x=>{
    const date=day(x.data),done=['concluida','concluido','done'].includes(String(x.status??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
    const subjectId=Object.values(subjects).find(s=>s.name===x.materia)?.id;
    return {id:x.id,date,subjectId,subject:x.materia,title:x.titulo,type:x.tipo||'estudo',minutes:num(x.minutos)||Math.round(num(x.segundos)/60),status:done?'done':date<today?'late':'pending',auto:!!x.automatica||!!x.auto||x.origem==='automatico',raw:x};
  }).sort((a,b)=>a.date.localeCompare(b.date));
  for(const o of [-1,0,1]) weeks[o]=tasks.filter(x=>x.date>=weekStart(o)&&x.date<=shift(weekStart(o),6));
  const dates={}, cardsByDay={}, roundsByDay={};
  const stat = d => dates[d] ??= {date:d,n:0,...zero()};
  const review=zero();
  for(const r of source('rodadas')){
    const date=day(r.fim??r.inicio);if(!date)continue;
    const d=stat(date), totals={correct:num(r.certos),wrong:num(r.errados),blank:num(r.brancos)};
    d.correct+=totals.correct;d.wrong+=totals.wrong;d.blank+=totals.blank;d.n+=totals.correct+totals.wrong+totals.blank;
    roundsByDay[date]=(roundsByDay[date]??0)+1;
    if(/revis|caderno|recuper/i.test(r.modo||''))for(const k of Object.keys(review))review[k]+=totals[k];
  }
  for(const c of Object.values(reviews))for(const h of arr(c.hist)){
    const date=day(h.em);if(date)cardsByDay[date]=(cardsByDay[date]??0)+1;
  }
  const first=Object.keys(dates).sort()[0]||today;
  for(let i=0,d=first;d<=today&&i<3700;i++,d=shift(d,1))stat(d);
  stat(today);
  const exam = 'Câmara dos Deputados · Analista Legislativo';
  const config=source('config').find(x=>x.id==='simulado')||{};
  const examBlocks=arr(config.obj?.blocos).map(b=>({block:b.prova,label:b.nome,subjects:arr(b.mats).map(entry=>{
    if(!Array.isArray(entry))return null;
    const [sigla, label, planned]=entry; const n=planned??label;
    const id=String(sigla??'').toLowerCase();
    return {id,name:subjects[id]?.name||(typeof label==='string'?label:sigla),planned:num(n),available:activeQuestions.filter(q=>q.subjectId===id).length};
  }).filter(Boolean)}));
  const examItems=examBlocks.flatMap(b=>b.subjects.flatMap(s=>activeQuestions.filter(q=>q.subjectId===s.id).slice(0,s.planned).map(q=>({id:q.id,s:s.name,key:q.key,text:q.statement}))));
  const history=source('simulados').map(s=>{
    const items=arr(s.itens), result=zero();
    if(s.tipo==='obj')for(const i of items){
      const k=keyOf(i.gabarito??rawQuestions[i.qid]?.gabarito), a=keyOf(i.marcada);
      if(!a||a==='B')result.blank++;
      else if(k)result[a===k?'correct':'wrong']++;
    }
    const known=result.correct+result.wrong+result.blank===items.length;
    const date=day(s.data??s.inicio);
    return {id:s.id,date:date?date.split('-').reverse().join('/'):'—',kind:s.tipo==='obj'?'Objetiva':'Discursiva',items:s.tipo==='obj'?items.length:null,minutes:num(s.minutos),...(s.tipo==='obj'&&known?result:{correct:null,wrong:null,blank:null}),net:s.tipo==='obj'?(s.notaLiquida??(typeof s.p1==='number'&&typeof s.p2==='number'?s.p1+s.p2:null)):null,note:s.tipo==='disc'&&s.nota!=null?'Nota: '+s.nota:null};
  }).reverse();
  const next=tasks.find(t=>t.type==='simulado'&&t.date>=today&&t.status!=='done');
  const displayName=user?.full_name||user?.name||'Conta administradora';
  const displaySubjects=Object.values(subjects);
  const QB_DATA={user:{name:displayName,initials:displayName.split(/\s+/).slice(0,2).map(s=>s[0]).join('')},exam,questions:curated.questions,flashcards:curated.cards,questionBank:activeQuestions,excludedQuestionIds,mapNodes,mindMaps,concepts,studySubjects:displaySubjects,roots,masteryText:{},answers,reviews};
  return {QB_DATA,QB_EDITAL:{subjects:displaySubjects.map(s=>({...s,topics:s.topics.filter(t=>!t.foraEdital)})).filter(s=>s.topics.length),groupTitles:{},blocks},QB_PLAN:{today,weekday,weekStart,addDays:shift,weeks,tasks,hours:Array(7).fill(0),cycle:[]},QB_PERF:{days:Object.values(dates).sort((a,b)=>a.date.localeCompare(b.date)),today:{flashcards:cardsByDay[today]??0,rounds:roundsByDay[today]??0},cardsByDay,roundsByDay,review:{...review,n:review.correct+review.wrong+review.blank}},QB_SIM:{profile:exam,next:{date:next?.date||'',label:next?next.date.split('-').reverse().join('/'):'Sem data agendada'},objective:{items:examBlocks.flatMap(b=>b.subjects).reduce((n,s)=>n+s.planned,0),minutes:num(config.obj?.min)},discursive:{minutes:num(config.disc?.min),minLines:20,maxLines:50},scoring:{correct:1,wrong:-1,blank:0},blocks:examBlocks,items:examItems,history},records};
}