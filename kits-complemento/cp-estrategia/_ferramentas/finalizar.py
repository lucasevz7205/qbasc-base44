#!/usr/bin/env python3
"""Aplica a revisão do Opus (revisao-itens.json) a itens.json e grava o kit final em final/aulaNN/."""
import json, os, sys, re
BASE = os.path.dirname(os.path.abspath(__file__))
NOMES = {'F1': 'F1 · Generalização', 'F2': 'F2 · Restrição indevida', 'F3': 'F3 · Troca de conceito',
         'F4': 'F4 · Detalhe alterado', 'F5': 'F5 · Regra × exceção', 'F6': 'F6 · Relação lógica',
         'V1': 'V1 · Paráfrase fiel', 'V2': 'V2 · Incompleto não é errado', 'V3': 'V3 · Alcance verdadeiro',
         'V4': 'V4 · Exceção real'}
# ajustes de rótulo pedidos expressamente pelo revisor (aula 03)
ROTULOS = {'03': {'q01': 'V2', 'q03': 'V1', 'q21': 'V1', 'q40': 'V1', 'q04': 'F3', 'q10': 'F3', 'q17': 'F3',
                  'q22': 'F3', 'q31': 'F3', 'q37': 'F3', 'q49': 'F3', 'q51': 'F3'}}

def run(a):
    d = f'{BASE}/saida/aula{a}'
    itens = json.load(open(f'{d}/itens.json', encoding='utf-8'))
    rev = {r['id']: r for r in json.load(open(f'{d}/revisao-itens.json', encoding='utf-8'))}
    out = []; stats = {'APROVADO': 0, 'CORRIGIDO': 0, 'DESCARTAR': 0}
    for it in itens:
        r = rev.get(it['id'])
        if not r:
            raise SystemExit(f'{a}: item {it["id"]} sem decisão do revisor')
        dec = r['decisao'].split()[0].upper()
        stats[dec] = stats.get(dec, 0) + 1
        if dec.startswith('DESCART'):
            continue
        if dec == 'CORRIGIDO':
            if r.get('novo_enunciado'): it['enunciado'] = r['novo_enunciado']
            if r.get('novo_assertiva'): it['assertiva'] = r['novo_assertiva']
            if r.get('novo_comentario'): it['comentario'] = r['novo_comentario']
            if r.get('novo_gabarito'): it['gabarito'] = r['novo_gabarito']
            if r.get('novo_mecanismo'): it['mecanismo'] = r['novo_mecanismo'].split()[0]
            if r.get('novo_enunciado') and 'assertiva' in it and not r.get('novo_assertiva'):
                it.pop('assertiva', None)
        short = it['id'].split('-')[-1]
        if short in ROTULOS.get(a, {}):
            it['mecanismo'] = ROTULOS[a][short]
        it['mecanismoNome'] = NOMES.get(it['mecanismo'], it['mecanismo'])
        it['gabarito_cego'] = r['gabarito_cego']
        it['mecanismo_cego'] = r['mecanismo_cego']
        it['concorda_gabarito'] = r['gabarito_cego'] == it['gabarito']
        it['concorda_mecanismo'] = r['mecanismo_cego'] == it['mecanismo']
        it['status_revisao'] = 'corrigido' if dec == 'CORRIGIDO' else 'ok'
        if dec == 'CORRIGIDO': it['nota_revisao'] = r.get('motivo', '')
        out.append(it)
    os.makedirs(f'{BASE}/final/aula{a}', exist_ok=True)
    for f in ('mapa', 'cartoes'):
        open(f'{BASE}/final/aula{a}/{f}.json', 'w', encoding='utf-8').write(open(f'{d}/{f}.json', encoding='utf-8').read())
    json.dump(out, open(f'{BASE}/final/aula{a}/itens.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(a, stats, 'finais:', len(out))

for a in sys.argv[1:]:
    run(a)
