// Source-bound, declarative component board. No generated executable code.
export const ASR_NODE='kit-arr-rf-1.1-reconhecimento-automatico-de-fala-asr-au-2026-11-22-r2.2';
const parts=[
 {id:'features',title:'Extração de características',role:'Transformar áudio em vetores por quadro.',origin:'Algoritmo fixo, sem treino',input:'Áudio',output:'Vetores por quadro',anchor:'1. Extração de características: áudio → vetores por quadro (cálculo fixo, sem treino)',x:24,y:30,icon:'wave'},
 {id:'acoustic',title:'Modelo acústico',role:'Calcular verossimilhança por fone a partir dos vetores.',origin:'Áudio transcrito',input:'Vetores',output:'Verossimilhança por fone',anchor:'2. Modelo acústico: vetores → verossimilhança por fone (aprende com áudio transcrito)',x:250,y:30,icon:'acoustic'},
 {id:'lexicon',title:'Léxico de pronúncia',role:'Relacionar palavras e sequências de fones; delimitar vocabulário.',origin:'Dicionários de pronúncia',input:'Palavras e fones',output:'Correspondências de pronúncia',anchor:'3. Léxico de pronúncia: palavra ↔ sequência de fones; delimita o vocabulário',x:250,y:145,icon:'lexicon'},
 {id:'language',title:'Modelo de linguagem',role:'Estimar probabilidade de uma sequência de palavras.',origin:'Texto puro',input:'Sequências de palavras',output:'Probabilidade da sequência',anchor:'4. Modelo de linguagem (LM): palavras → probabilidade da sequência (aprende só com texto)',x:250,y:260,icon:'language'},
 {id:'decoder',title:'Decodificador',role:'Combinar acústico, léxico e linguagem para buscar a melhor frase.',origin:'Algoritmo fixo, sem treino',input:'Informações dos três modelos',output:'Melhor hipótese de frase',anchor:'5. Decodificador: combina os três blocos acima e busca a melhor frase (não aprende; busca)',x:476,y:145,icon:'decoder'}
];
const edges=[['features','acoustic'],['acoustic','decoder'],['lexicon','decoder'],['language','decoder']];
export const ASR_PARTS=Object.freeze(parts.map(p=>Object.freeze(p)));
export const ASR_EDGES=Object.freeze(edges.map(e=>Object.freeze(e)));
const boundedText=(s,n=500)=>typeof s==='string'&&s.trim().length>0&&s.length<=n;
const id=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{0,39}$/.test(s);
export function validateComponentBoard(model){
 if(!model||!id(model.id)||!boundedText(model.version,80)||!boundedText(model.sourceNode,250)||!boundedText(model.reference)||!boundedText(model.limit)||!['logical-2d'].includes(model.dimension)||!Array.isArray(model.parts)||model.parts.length<2||model.parts.length>12||!Array.isArray(model.edges)||model.edges.length>24)return false;
 const allowed=new Set(['id','title','role','origin','input','output','anchor','x','y','icon']);
 const icons=new Set(['wave','acoustic','lexicon','language','decoder']);
 const ids=new Set();
 for(const p of model.parts){
   if(!p||Object.keys(p).some(k=>!allowed.has(k))||!id(p.id)||ids.has(p.id)||!['title','role','origin','input','output','anchor'].every(k=>boundedText(p[k]))||!icons.has(p.icon)||!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<0||p.y<0||p.x+180>700||p.y+86>380)return false;
   ids.add(p.id);
 }
 for(let i=0;i<model.parts.length;i++)for(let j=i+1;j<model.parts.length;j++){const a=model.parts[i],b=model.parts[j];if(Math.abs(a.x-b.x)<180&&Math.abs(a.y-b.y)<86)return false;}
 const seen=new Set();
 for(const e of model.edges){if(!Array.isArray(e)||e.length!==2||!ids.has(e[0])||!ids.has(e[1])||e[0]===e[1]||seen.has(e.join(':')))return false;seen.add(e.join(':'));}
 return true;
}
export function getAsrBoard(kit){
 if(kit?.topico!=='rf-1-1'||kit.materia!=='rf')return null;
 const node=kit.ramos?.flatMap(r=>r.f||[]).find(n=>n.id===ASR_NODE);
 if(!node?.x?.src||!node.x.e?.includes('Cada bloco do pipeline clássico responde a uma pergunta distinta')||!Array.isArray(node.caixa?.itens)||!parts.every(p=>node.caixa.itens.includes(p.anchor)))return null;
 const model={id:'asr-modular',version:'1.0.0',sourceNode:node.id,reference:node.x.src,dimension:'logical-2d',limit:'Arquitetura lógica do ASR clássico; não é um dispositivo físico, nem uma execução de reconhecimento de fala.',parts:parts.map(p=>({...p})),edges:edges.map(e=>[...e])};
 return validateComponentBoard(model)?model:null;
}
export function componentFocus(model,partId){
 if(!validateComponentBoard(model))return null;
 const part=model.parts.find(p=>p.id===partId);
 if(!part)return null;
 return {...part,reference:model.reference,neighbors:model.edges.filter(e=>e.includes(partId)).map(e=>e[0]===partId?e[1]:e[0])};
}
export function asrExercise(p){
 const part=ASR_PARTS.find(x=>x.id===p.part);
 if(!part)throw Error('Unknown ASR component');
 const roles=Object.fromEntries(ASR_PARTS.map(x=>[x.id,x.role]));
 const origins={fixed:'Algoritmo fixo, sem treino',audio:'Áudio transcrito',dictionary:'Dicionários de pronúncia',text:'Texto puro'};
 const origin=Object.keys(origins).find(k=>origins[k]===part.origin);
 return {fields:[{id:'role',label:'Qual a função do bloco selecionado?',type:'choice',options:roles,expected:part.id},{id:'origin',label:'Qual sua fonte ou natureza?',type:'choice',options:origins,expected:origin}],explanation:part.title+': '+part.role+' Fonte ou natureza: '+part.origin+'.'};
}
