// Bibliographic remissions for design decisions, not proof of QBAsc efficacy.
export const PEDAGOGICAL_REFERENCES=Object.freeze({
  deft:{title:'Ainsworth (2006) — DeFT',url:'https://doi.org/10.1016/j.learninstruc.2006.03.001',application:'Selecionar representações pelas funções e tarefas cognitivas; considerar coordenação entre representações.',limit:'Quadro conceitual, não algoritmo de classificação automática.'},
  mayer:{title:'Mayer (2021) — Processamento extrínseco',url:'https://doi.org/10.1017/9781108894333.019',application:'Coerência, sinalização e contiguidade entre explicação e imagem.',limit:'O efeito depende da tarefa e do desenho da apresentação.'},
  cromley:{title:'Cromley e Chen (2025) — Metanálise multimídia',url:'https://doi.org/10.1016/j.edurev.2025.100730',application:'Preferir o formato funcional ao objetivo, sem presumir vantagem de maior sofisticação.',limit:'Resultados variam por modalidade e desfecho; não valida o QBAsc.'},
  simulation:{title:'Chernikova et al. (2020) — Simulação no ensino superior',url:'https://doi.org/10.3102/0034654320933544',application:'Orientação e suporte ajustados ao conhecimento prévio.',limit:'Evidência de outros domínios; extrapolação para concursos a testar.'},
  generative:{title:'Fiorella e Mayer (2015) — Aprendizagem generativa',url:'https://doi.org/10.1017/CBO9781107707085',application:'Autoexplicação, elaboração e recuperação ativa.',limit:'Manipular ou selecionar opções não garante construção de significado.'},
  transfer:{title:'Pan e Rickard (2018) — Transferência da prática de recuperação',url:'https://pubmed.ncbi.nlm.nih.gov/29733621/',application:'Avaliar aplicação inédita, congruência da resposta e recuperação elaborada.',limit:'Transferência não é automática; exigir teste independente do modelo.'},
  coherence:{title:'Sundararajan e Adesope (2020) — Detalhes sedutores',url:'https://doi.org/10.1007/s10648-020-09522-4',application:'Excluir informação irrelevante para a tarefa.',limit:'Não implica excluir todo elemento estético.'},
  icap:{title:'Chi e Wylie (2014) — ICAP',url:'https://doi.org/10.1080/00461520.2014.965823',application:'Distinguir ação física de elaboração cognitiva e interação construtiva.',limit:'Interface interativa não equivale automaticamente à categoria Interactive do ICAP.'},
  poe:{title:'How effective is instructional support for learning with computer simulations? (2012)',url:'https://doi.org/10.1007/s11251-012-9220-y',application:'Predizer um resultado, observar e explicar discrepâncias.',limit:'O modo atual é interpretação com evidência visível; o ciclo prospectivo ainda será implementado.'}
});
export function representationEvidence(kind){
  if(!['simulation','chart','timeline','comparison','anatomy','analogy','text'].includes(kind))return [];
  const common=['deft','mayer','cromley','coherence','generative','transfer','icap'];
  const keys=kind==='simulation'||kind==='chart'||kind==='timeline'?[...common,'simulation','poe']:common;
  return keys.map(k=>({...PEDAGOGICAL_REFERENCES[k],id:k}));
}
