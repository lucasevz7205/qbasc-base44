const arr = x => Array.isArray(x) ? x : [];
const str = x => Array.isArray(x) ? x.map(str).filter(Boolean).join('\n') : typeof x === 'string' ? x : '';
const num = x => Number.isFinite(Number(x)) ? Number(x) : 0;
const day = value => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (!value || !Number.isFinite(new Date(value).getTime())) return '';
  return new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Sao_Paulo'}).format(new Date(value));
};
const shift = (d,n) => { const date = new Date(d+'T12:00:00Z'); date.setUTCDate(date.getUTCDate()+n); return date.toISOString().slice(0,10); };
const status = (v) => ({dominado:'mastered', revisando:'reviewing', revisado:'reviewing', estudado:'studying', estudo:'studying', 'em estudo':'studying', em_estudo:'studying', estudando:'studying', concluido:'mastered', concluida:'mastered'})[String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()] || 'not-started';
const icons = {lp:'feather',li:'globe',da:'building-2',dc:'landmark',ti:'database',lg:'languages',rf:'audio-lines',pl:'scroll-text',cp:'vote'};
const blocks = {P1:'Conhecimentos básicos',P2:'Conhecimentos específicos'};
const zero = () => ({correct:0,wrong:0,blank:0});
const keyOf = x => String(x??'').trim().toUpperCase();
const chapterKey = x => keyOf(x);
export { day as studyDate };
export function adaptStudy(records, user, now = new Date()) {
  const today = day(now);
  const source = key => arr(records[key]);
  const topics = {}, subjects = {}, capTopic = {};
  for (const e of [...source('edital')].sort((a,b)=>num(a.materiaOrdem)-num(b.materiaOrdem)||num(a.ordem)-num(b.ordem))) {
    if(!e.id || !e.materia) continue;
    const subjectId = String(e.sigla || e.id.split('-')[0]).toLowerCase();
    const subject = subjects[subjectId] ??= {id:subjectId,name:e.materia,short:e.sigla||subjectId,block:e.prova,blockLabel:blocks[e.prova],icon:icons[subjectId]||'book-open',topics:[]};
    const t = {id:e.id,subjectId,num:String(e.num??''),title:e.titulo,known:!!e.titulo,status:status(e.status),foraEdital:!!e.foraEdital,...zero()};
    topics[t.id]=t;
    subject.topics.push(t);
    for(const cap of arr(e.caps)) if(!capTopic[chapterKey(cap)]) capTopic[chapterKey(cap)]=t;
  }
  const answers = Object.fromEntries(source('respostas').map(r=>[r.qid??r.id,r]));
  const rawQuestions = Object.fromEntries(source('questoes').map(q=>[q.id,q]));
  const mapNodes=[], mindMaps=[], concepts={}, flashcards=[], roots={}, aliases={};
  for(const d of source('revisao')){
    const topicId = d.topico || String(d.id).replace(/\.(mapa|cartoes)$/,'');
    const map=d.mapa || d.root;
    const branch=arr(map?.ramos??map?.children??map?.nos);
    if(map && (branch.length || map.centro)){
      const root=topicId+'::'+d.id, title=str(map.centro??map.titulo??map.t)||topics[topicId]?.title||topicId;
      const nodes=[];
      const add=(v,parent,path)=>{
        if(!v || typeof v!=='object')return;
        const id=parent?root+'::'+path:root;
        const label=str(v.t??v.label??v.titulo??v.rotulo)||title;
        nodes.push({id,parent,label});
        concepts[id]={summary:str(v.x??v.explicacao??v.definicao??v.n),example:str(v.ex??v.exemplo),sources:arr(d.fontes).map(f=>({label:str(f?.titulo??f?.label??f),url:typeof f?.url==='string'&&/^https?:\/\//i.test(f.url)?f.url:undefined})).filter(f=>f.label)};
        if(v.id)(aliases[topicId]??={})[v.id]=id;
        arr(v.ramos??v.children??v.nos??v.filhos??v.sub??v.f).forEach((n,i)=>add(n,id,path+'.'+i));
      };
      add({...map,t:title,ramos:branch},null,'0');
      roots[topicId] ??= root;
      mindMaps.push({id:root,topicId,title,nodes});
      mapNodes.push(...nodes);
    }
    arr(d.cartoes??d.cards).forEach((c,i)=>{
      const front=str(c.q??c.frente??c.front??c.pergunta),back=str(c.a??c.verso??c.back??c.resposta);
      if(front&&back)flashcards.push({id:c.id||topicId+'@'+i,topicId,front,back,basis:str(c.src??c.ref??c.fonte),nodeRef:c.mapaNoId??c.no??c.node??c.mapaNo});
    });
  }
  const uniqueCards=[...new Map(flashcards.map(c=>[c.id,c])).values()];
  for(const card of uniqueCards)card.node=aliases[card.topicId]?.[card.nodeRef]||roots[card.topicId];
  const questionBank=[];
  for(const q of Object.values(rawQuestions)){
    const topic=topics[q.topico??q.topicId] || capTopic[chapterKey(q.cap)];
    const r=answers[q.id];
    if(topic&&r){topic.correct+=num(r.acertos);topic.wrong+=num(r.erros);topic.blank+=num(r.brancos);}
    if(!['C','E'].includes(keyOf(q.gabarito))||!q.enunciado)continue;
    questionBank.push({id:q.id,code:q.id,year:q.ano,tags:[q.tema||q.capNome].filter(Boolean),key:keyOf(q.gabarito),statement:q.enunciado,explanation:str(q.comentario??q.explicacao),basis:str(q.ref),origin:q.origem,topicId:topic?.id,subjectId:topic?.subjectId,subject:subjects[topic?.subjectId]?.name,chapter:q.capNome||q.cap,node:aliases[topic?.id]?.[q.mapaNoId??q.no??q.node??q.mapaNo]||roots[topic?.id],response:r,raw:q});
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
    return {id,name:subjects[id]?.name||(typeof label==='string'?label:sigla),planned:num(n),available:questionBank.filter(q=>q.subjectId===id).length};
  }).filter(Boolean)}));
  const examItems=examBlocks.flatMap(b=>b.subjects.flatMap(s=>questionBank.filter(q=>q.subjectId===s.id).slice(0,s.planned).map(q=>({id:q.id,s:s.name,key:q.key,text:q.statement}))));
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
  const QB_DATA={user:{name:displayName,initials:displayName.split(/\s+/).slice(0,2).map(s=>s[0]).join('')},exam,questions:questionBank,flashcards:uniqueCards,questionBank,mapNodes,mindMaps,concepts,roots,masteryText:{},answers,reviews};
  return {QB_DATA,QB_EDITAL:{subjects:displaySubjects.map(s=>({...s,topics:s.topics.filter(t=>!t.foraEdital)})).filter(s=>s.topics.length),groupTitles:{},blocks},QB_PLAN:{today,weekday,weekStart,addDays:shift,weeks,tasks,hours:Array(7).fill(0),cycle:[]},QB_PERF:{days:Object.values(dates).sort((a,b)=>a.date.localeCompare(b.date)),today:{flashcards:cardsByDay[today]??0,rounds:roundsByDay[today]??0},cardsByDay,roundsByDay,review:{...review,n:review.correct+review.wrong+review.blank}},QB_SIM:{profile:exam,next:{date:next?.date||'',label:next?next.date.split('-').reverse().join('/'):'Sem data agendada'},objective:{items:examBlocks.flatMap(b=>b.subjects).reduce((n,s)=>n+s.planned,0),minutes:num(config.obj?.min)},discursive:{minutes:num(config.disc?.min),minLines:20,maxLines:50},scoring:{correct:1,wrong:-1,blank:0},blocks:examBlocks,items:examItems,history},records};
}
