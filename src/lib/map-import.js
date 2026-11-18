import {parseHierarchicalMindMap} from './import-map-parser.js';

export const modelPrompt = `Transforme o material fornecido em Markdown para o QBAsc. Entregue somente o mapa. Preserve a ordem do material. Explique cada ramo e folha em uma ou duas frases, inclusive siglas. Use dois espaços de recuo por nível e uma linha por campo. Inclua fontes verificáveis quando disponíveis e marque exemplos hipotéticos. Omita campos opcionais sem conteúdo.

# Nome do assunto
## Primeiro ramo
- Definição: explicação do ramo.
- Fonte: aula e página.
- **Microtópico**: explicação.
  - Exemplo: aplicação prática.
  - Pegadinha: confusão frequente e sua correção.
  - **Folha**: regra ou condição específica.
## Segundo ramo
- Definição: explicação.
- **Microtópico**: explicação.`;

export function parseImport(text) {
  if(text.length > 27000) throw Error('Divida o texto em partes de até 27 mil caracteres.');
  const tree=parseHierarchicalMindMap(text,'Mapa mental','import',{force:true});
  if(!tree || !text.trim().startsWith('# ')) throw Error('Comece com # Assunto e acrescente ao menos um ramo com ##.');
  if(tree.warnings.length) throw Error(tree.warnings.join(' '));
  return tree;
}
export function importResult(current, tree, entry, concepts, convert) {
  const fresh=entry.mode==='new', merge=entry.mode==='merge';
  const id=fresh ? entry.id : current.id;
  const prior=fresh ? [] : current.nodes;
  const nodes=merge ? [...prior] : [];
  const used=new Set();
  const removed=[];
  if(!merge) nodes.push({id,parent:null,label:tree.centro});
  function visit(branch,parent){
    const matches=prior.filter(n=>n.parent===parent && n.label===branch.t);
    const match=matches.length===1 && !used.has(matches[0].id) ? matches[0] : null;
    const key=match?.id || entry.id+'::'+branch.id;
    used.add(key);
    if(!merge || !match) nodes.push({id:key,parent,label:branch.t});
    if(!merge || !match || entry.choices?.[branch.id]==='incoming') concepts[key]=convert(branch);
    for(const child of branch.f||[]) visit(child,key);
  }
  for(const branch of tree.ramos) visit(branch,id);
  if(!merge) for(const n of prior) if(n.id!==id && !used.has(n.id)) removed.push(n.label);
  return {id,title:merge?current.title:tree.centro,nodes,removed};
}
