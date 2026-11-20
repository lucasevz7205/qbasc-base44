import mapaMd from '@/data/kits/dc-8-2/mapa.md?raw';
import cartoesMd from '@/data/kits/dc-8-2/cartoes.md?raw';

function fillGroupDetails(node) {
  node.ramos.forEach(fillGroupDetails);
  // Os agrupamentos sem texto próprio usam as explicações e fontes dos filhos.
  node.x ||= node.ramos.map(child => child.x).join('\n');
  node.src ||= [...new Set(node.ramos.flatMap(child => child.src))];
}

function readBranch(t, lines) {
  const branch = { t, x: '', src: '', ramos: [] };
  const path = [branch];
  for (const line of lines) {
    const heading = line.match(/^( *)- \*\*(.+?)\*\*(.*)$/);
    if (heading) {
      const level = heading[1].length / 2 + 1;
      const node = { t: (heading[2] + heading[3]).trim(), x: '', src: '', ramos: [] };
      path[level - 1].ramos.push(node);
      path.splice(level, path.length, node);
      continue;
    }

    const field = line.trim().replace(/^- /, '');
    const current = path.at(-1);
    if (field.startsWith('x: ')) {
      const [explanation, source] = field.slice(3).split(/\s+Fonte: /);
      current.x = explanation;
      if (source) current.src = source;
    } else if (field.startsWith('Fonte: ')) {
      current.src = field.slice(7);
    }
  }
  fillGroupDetails(branch);
  return branch;
}

const [, root, ...sections] = mapaMd.split(/^## /m);
const [, rootTitle, ...rootLines] = root.split(/\r?\n/);
const { t: centro, x, src } = readBranch(rootTitle.replace(/\*\*/g, ''), rootLines);
const ramos = sections.filter(section => /^R[1-8] · /.test(section)).map(section => {
  const [title, ...lines] = section.split(/\r?\n/);
  return readBranch(title, lines);
});

const cartoes = Array.from(cartoesMd.matchAll(/^P: (.+)\r?\nR: (.+) \((RCCN, .+)\)\r?$/gm),
  ([, q, a, src]) => ({ q, a, src }));

export const DC_8_2_REVISAO = [{ id: 'dc-8-2.mapa', topico: 'dc-8-2', mapa: { centro, x, src, ramos }, cartoes }];
