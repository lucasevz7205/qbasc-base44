#!/usr/bin/env python3
"""Valida um kit de complemento do Estratégia (mapa.json, cartoes.json, itens.json).
Uso: python3 -I validar_complemento.py <pasta-do-kit> <fontes/aulaNN.paginas.txt>
Regra de fonte literal: cada 'evidencia' (itens) e cada 'citacao' (nós do mapa e cartões) precisa
aparecer, palavra por palavra, na página citada em 'ref'/'fonte' (formato 'Aula NN, p. X').
Trechos separados por '[...]' são conferidos um a um."""
import json, re, sys, os, unicodedata

def norm(s):
    s = unicodedata.normalize('NFKC', s)
    s = s.replace('­', '').replace('“', '"').replace('”', '"').replace('‘', "'").replace('’', "'")
    s = re.sub(r'-\s*\n\s*', '', s)
    s = re.sub(r'\s+', ' ', s).strip().lower()
    return s

def load_pages(path):
    t = open(path, encoding='utf-8').read()
    pages = {}
    for m in re.finditer(r'=== PÁGINA (\d+) ===\n(.*?)(?=\n=== PÁGINA \d+ ===|\Z)', t, re.S):
        pages[int(m.group(1))] = norm(m.group(2))
    return pages

def pages_in(ref):
    out = []
    for m in re.finditer(r'\bp\.?\s*(\d+)(?:\s*[-–]\s*(\d+))?', ref or ''):
        a = int(m.group(1)); b = int(m.group(2) or a)
        out += list(range(a, b + 1))
    return out

def check_literal(quote, ref, pages, where, errs):
    pgs = pages_in(ref)
    if not pgs:
        errs.append(f'{where}: sem página em "{ref}"'); return
    if not quote or not quote.strip():
        errs.append(f'{where}: citação vazia'); return
    for seg in re.split(r'\[\.\.\.\]|\.\.\.|…', quote):
        seg = norm(seg).strip(' .,;:"')
        if len(seg) < 12:
            continue
        if not any(seg in pages.get(p, '') for p in pgs):
            errs.append(f'{where}: trecho não literal nas páginas {pgs}: "{seg[:90]}"')

def walk(nodes, depth, out):
    for n in nodes:
        out.append((n, depth))
        walk(n.get('f', []) or [], depth + 1, out)

def main(kdir, fonte):
    pages = load_pages(fonte)
    errs, warns = [], []
    mapa = json.load(open(os.path.join(kdir, 'mapa.json'), encoding='utf-8'))
    only_map = not os.path.exists(os.path.join(kdir, 'itens.json')) or not os.path.exists(os.path.join(kdir, 'cartoes.json'))
    cartoes = [] if only_map else json.load(open(os.path.join(kdir, 'cartoes.json'), encoding='utf-8'))
    itens = [] if only_map else json.load(open(os.path.join(kdir, 'itens.json'), encoding='utf-8'))
    for k in ('topico', 'materia', 'centro', 'ramos'):
        if k not in mapa: errs.append(f'mapa sem {k}')
    nodes = []
    walk(mapa.get('ramos', []), 2, nodes)
    ids = {}
    for n, d in nodes:
        w = f'nó {n.get("id")}'
        if not n.get('id') or not n.get('t'): errs.append(f'{w}: sem id/t')
        if n.get('id') in ids: errs.append(f'{w}: id duplicado')
        ids[n.get('id')] = (n, d)
        x = n.get('x') or {}
        if not x.get('e'): errs.append(f'{w}: sem x.e')
        if not x.get('src'): errs.append(f'{w}: sem x.src')
        if x.get('cit'):
            check_literal(x['cit'], x.get('src', ''), pages, w + ' (cit)', errs)
        else:
            errs.append(f'{w}: sem x.cit (citação literal da fonte)')
    # hierarquia: nós com filhos
    has_child = {n.get('id'): bool(n.get('f')) for n, d in nodes}
    sub_nodes = [n for n, d in nodes if d >= 3 or (d == 2)]
    # itens
    seen = set(); c = e = 0
    per_node = {}
    for it in itens:
        w = f'item {it.get("id")}'
        for k in ('id', 'no', 'enunciado', 'gabarito', 'comentario', 'ref', 'origem', 'mecanismo', 'evidencia', 'vacina', 'tema'):
            if not it.get(k): errs.append(f'{w}: sem {k}')
        if it.get('id') in seen: errs.append(f'{w}: id duplicado')
        seen.add(it.get('id'))
        if it.get('gabarito') not in ('C', 'E'): errs.append(f'{w}: gabarito inválido')
        c += it.get('gabarito') == 'C'; e += it.get('gabarito') == 'E'
        if it.get('origem') != 'inédito Claude': errs.append(f'{w}: origem deve ser "inédito Claude"')
        if it.get('no') not in ids: errs.append(f'{w}: nó {it.get("no")} inexistente')
        per_node[it.get('no')] = per_node.get(it.get('no'), 0) + 1
        if not re.match(r'^(F([1-9]|10)|V[1-4])$', it.get('mecanismo', '')): errs.append(f'{w}: mecanismo inválido')
        if re.search(r'\b(Logo|Portanto|Conclui-se|Com base nesse)\b', it.get('enunciado', '')): errs.append(f'{w}: conclusão genérica no enunciado')
        check_literal(it.get('evidencia', ''), it.get('ref', ''), pages, w, errs)
        if it.get('trechoDecisivo') and norm(it['trechoDecisivo']) != norm(it.get('evidencia', '')):
            errs.append(f'{w}: trechoDecisivo difere da evidencia')
        if not re.search(r'Aula \d\d, p\.', it.get('ref', '')): errs.append(f'{w}: ref fora do formato "Estratégia, Aula NN, p. X"')
    if not only_map and len(itens) < 20: errs.append(f'só {len(itens)} itens (mínimo 20)')
    if itens and not (0.4 <= c / len(itens) <= 0.6): warns.append(f'equilíbrio C/E: {c}C/{e}E')
    # cartões
    cseen = set(); per_c = {}
    for cd in cartoes:
        w = f'cartão {cd.get("id")}'
        for k in ('id', 'no', 'pergunta', 'resposta', 'fonte'):
            if not cd.get(k): errs.append(f'{w}: sem {k}')
        if cd.get('id') in cseen: errs.append(f'{w}: id duplicado')
        cseen.add(cd.get('id'))
        if cd.get('no') not in ids: errs.append(f'{w}: nó inexistente')
        per_c[cd.get('no')] = per_c.get(cd.get('no'), 0) + 1
        r = cd.get('resposta')
        if not isinstance(r, list) or not 1 <= len(r) <= 3: errs.append(f'{w}: resposta deve ser lista de 1 a 3')
        if re.match(r'\s*(Qual artigo|Em qual artigo|O que a banca)', cd.get('pergunta', ''), re.I): errs.append(f'{w}: pergunta proibida')
        if re.match(r'\s*(é|são|existe|pode|deve)\b.*\?$', cd.get('pergunta', ''), re.I) and len(cd.get('pergunta', '')) < 60:
            warns.append(f'{w}: possível pergunta sim/não')
        if not re.search(r'Aula \d\d, p\.', cd.get('fonte', '')): errs.append(f'{w}: fonte fora do formato')
        if cd.get('citacao'):
            check_literal(cd['citacao'], cd.get('fonte', ''), pages, w + ' (citacao)', errs)
        else:
            errs.append(f'{w}: sem citacao literal')
    # cobertura por nó
    for n, d in nodes:
        i = n.get('id')
        if only_map: continue
        if per_node.get(i, 0) < 1: errs.append(f'nó {i}: sem item')
        if per_c.get(i, 0) < 1: errs.append(f'nó {i}: sem cartão')
    print(f'{kdir}: {len(nodes)} nós, {len(cartoes)} cartões, {len(itens)} itens ({c}C/{e}E)')
    for w in warns: print('AVISO', w)
    for er in errs: print('ERRO ', er)
    print('RESULTADO:', 'APROVADO' if not errs else f'REPROVADO ({len(errs)} erros)')
    return 0 if not errs else 1

if __name__ == '__main__':
    sys.exit(main(sys.argv[1], sys.argv[2]))
