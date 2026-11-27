import { Buffer } from 'node:buffer';
/* global window, document */
import { URL } from 'node:url';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.NEXO_PLAYWRIGHT || 'playwright');
const origin = 'http://127.0.0.1:4179';
const manual = process.argv.includes('--manual');
const browser = await chromium.launch({ channel: 'msedge', headless: !manual, args: ['--disable-background-networking'] });
const viewport = manual || process.argv.includes('--wide') ? { width: 1360, height: 980 } : { width: 360, height: 800 };
const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
const admin = { id: 'nexo-ficticio', full_name: 'Pessoa Fictícia', email: 'piloto@example.invalid', role: 'admin' };
const syllabus = [
  { id: 'lg-3-2', materia: 'lg', titulo: 'Ideia principal e detalhes de apoio' },
  { id: 'cp-8', materia: 'cp', titulo: 'Política internacional e brasileira' },
  { id: 'rf-1-1', materia: 'rf', titulo: 'ASR' },
  { id: 'rf-1', materia: 'rf', titulo: 'Amostragem' },
  { id: 'cp-7', materia: 'cp', titulo: 'Consultas populares' },
  { id: 'ti-5-3', materia: 'ti', titulo: 'Tipos de modelo' },
];
const personal = { ...admin, id: 'nexo-ficticio-pessoal', role: 'user' };
let fixtureUser = admin;
const rows = {
  edital: syllabus,
  questoes: [{ id: 'fixture-item', cap: 'rf-1', enunciado: 'Item fictício de inicialização.', gabarito: 'C' }],
};
const response = (route, json) => route.fulfill({ status: 200, json });
const unexpectedWrites = [];
const blockedBackground = new Set();
await context.route('**/*', async route => {
  const request = route.request();
  const url = new URL(request.url());
  if (url.origin !== origin) return route.abort();
  if (request.method()!=='GET') {
    const handler = url.pathname.startsWith('/_serverFn/')
      ? Buffer.from(url.pathname.slice('/_serverFn/'.length), 'base64url').toString('utf8') : '';
    if (fixtureUser === personal && handler.includes('"export":"loadPersonalStudy_')) {
      return response(route, { result: { profile: {
        id: personal.id, status: 'active', architectEnabled: true,
      }, records: rows } });
    }
    if (url.pathname.endsWith('/analytics/track/batch')) blockedBackground.add('analytics');
    else if (handler.includes('"export":"saveStudyClockRecords_')) blockedBackground.add('study-clock');
    else unexpectedWrites.push(url.pathname);
    return route.abort();
  }
  if (/\/api\/(apps|app-logs)\/|\/_serverFn\//.test(url.pathname)) {
    if (url.pathname.startsWith('/_serverFn/') && Buffer.from(url.pathname.slice('/_serverFn/'.length), 'base64url').toString('utf8').includes('canOpenAccountPilot_')) return response(route, { result: fixtureUser === admin });
    if (url.pathname.endsWith('/entities/User/me') || url.pathname.endsWith('/auth/me')) return response(route, fixtureUser);
    if (url.pathname.endsWith('/entities/ClaudeDocument')) {
      const query = JSON.parse(url.searchParams.get('q') || '{}');
      return response(route, (rows[query.collection] || []).map(data => ({
        legacy_id: data.id, payload_json: JSON.stringify(data),
      })));
    }
    return route.abort();
  }
  return route.continue();
});
await context.addInitScript(() => window.localStorage.setItem('base44_access_token', 'nexo-e2e-fixture'));
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.setDefaultNavigationTimeout(60000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const button = name => page.getByRole('button', { name, exact: true });
const text = (value, options) => page.getByText(value, options);
const press = async locator => { await locator.focus(); await page.keyboard.press('Enter'); };
const select = async value => {
  const control = page.getByRole('combobox', { name: 'Tarefa de estudo', exact: true });
  await control.focus();
  await page.keyboard.press('Home');
  const values = await control.locator('option').evaluateAll(options => options.map(option => option.value));
  assert.ok(values.includes(value));
  for (let i=0; i<values.indexOf(value); i++) await page.keyboard.press('ArrowDown');
  assert.equal(await control.inputValue(), value);
};
const isVisible = async locator => locator.waitFor({ state: 'visible' });
const fit = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
async function place(piece, slot) {
  await press(page.getByRole('group', { name: 'Peças disponíveis' }).getByRole('button', { name: piece, exact: true }));
  await press(page.getByRole('group', { name: 'Tabuleiro de associações' }).getByRole('button', { name: slot }));
}
async function openPilot() {
  await isVisible(page.getByRole('tab', { name: 'Laboratório Visual' }));
  await press(page.getByRole('tab', { name: 'Laboratório Visual' }));
  await isVisible(page.getByRole('heading', { name: 'Piloto curado do NEXO' }));
}
if (manual) {
  await page.goto(origin + '/tutor');
  process.stdout.write('Prévia fictícia aberta em uma janela isolada. Feche a janela para encerrar.\n');
  await new Promise(resolve => {
    page.once('close', resolve);
    browser.once('disconnected', resolve);
  });
  await browser.close();
  process.exit(0);
}
try {
  await page.clock.install({ time: new Date('2026-11-27T15:00:00Z') });
  await page.goto(origin + '/tutor?clear_access_token=true', { waitUntil: 'domcontentloaded' });
  await isVisible(button('Entrar'));
  assert.equal(await page.getByRole('tab', { name: 'Laboratório Visual' }).count(), 0);
  await page.goto(origin + '/tutor', { waitUntil: 'domcontentloaded' });
  await isVisible(page.getByRole('tab', { name: 'Laboratório Visual' }));
  assert.equal(await page.getByRole('tab', { name: /Flashcards|Scanner/ }).count(), 0);
  const bounds = await page.locator('[data-qb-architect]').boundingBox();
  const inset = viewport.width >= 800 ? 96 / 2.54 : viewport.width * 0.03;
  for (const gap of [bounds.x, bounds.y, viewport.width - bounds.x - bounds.width, viewport.height - bounds.y - bounds.height]) {
    assert.ok(Math.abs(gap - inset) <= 1, 'Margem do estúdio: ' + gap);
  }
  await page.getByRole('tab', { name: 'Caderno Cornell' }).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('tab', { name: 'Laboratório Visual' }).getAttribute('aria-selected'), 'true');
  await openPilot();
  await fit();
  assert.equal(await button('Sair do modelo e julgar o item').isDisabled(), true);
  const evidence = text('Evidência por etapa da tarefa', { exact: true });
  await evidence.focus();
  await page.keyboard.press('Enter');
  await isVisible(text('a frequência máxima representada é a metade da taxa', { exact: true }));
  await press(button('Predição e correção'));
  assert.equal(await evidence.count(), 0);
  await isVisible(page.getByRole('img', { name: /Sinal de 5000 Hz/ }));
  assert.equal(await text('Frequência dobrada teórica:', { exact: false }).count(), 0);
  assert.equal(await page.locator('[aria-label="Fonte do experimento"] p').count(), 1);
  await page.getByLabel('Limite de Nyquist (kHz)').fill('4');
  await press(button('Acima do limite'));
  await page.getByLabel('Frequência dobrada teórica (kHz)').fill('3');
  await press(button('Verificar no modelo'));
  await isVisible(text('Predição correta', { exact: true }));
  assert.equal(await text('Aguardando o primeiro julgamento C/E.').count(), 1);
  await press(button('Sair do modelo e julgar o item'));
  await isVisible(text(/sensor de vibração/));
  assert.equal(await page.locator('[data-nexo-live-graph]').count(), 0);
  assert.equal(await text('Fonte do conceito', { exact: true }).count(), 0);
  const initialChoice = page.getByRole('radio', { name: 'Certo' });
  await initialChoice.focus();
  await page.keyboard.press('Space');
  await press(button('Confirmar julgamento'));
  await isVisible(text('Você errou. Gabarito Errado.'));
  await press(button('Voltar ao piloto'));
  await isVisible(text(/0\/1 itens C\/E corretos/));
  assert.equal(await button('Julgar item D+7').isDisabled(), true);
  await select('situar-consultas');
  await press(button('Treino de encaixe'));
  await fit();
  await place('Plebiscito', /Consulta antes do ato/);
  await place('Referendo', /Consulta depois do ato/);
  assert.equal(await button('Conferir respostas').isDisabled(), true);
  assert.equal(await text('Correto', { exact: true }).count(), 0);
  await place('Ratificar ou rejeitar o ato', /Finalidade do referendo/);
  await press(button('Conferir respostas'));
  await isVisible(text('No referendo, o povo ratifica ou rejeita o ato.'));
  await press(button('Sair do modelo e julgar o item'));
  await isVisible(text(/uma lei foi editada/));
  await page.getByRole('radio', { name: 'Errado' }).check();
  await press(button('Confirmar julgamento'));
  await isVisible(text('Você acertou. Gabarito Errado.'));
  await press(button('Voltar ao piloto'));
  await select('comparar-modelos');
  await press(button('Treino de encaixe'));
  await fit();
  const matrix = [
    ['P(Y|X) · probabilidade condicional','Discriminativo · Probabilidade'],
    ['P(X,Y) · distribuição conjunta','Generativo · Probabilidade'],
    ['Fronteiras entre categorias','Discriminativo · O que aprende'],
    ['A estrutura inteira dos dados','Generativo · O que aprende'],
    ['Classificar, detectar e predizer','Discriminativo · Função'],
    ['Produzir novas amostras','Generativo · Função'],
    ['Regressão logística, SVM, BERT','Discriminativo · Exemplos'],
    ['GPT, DALL·E, Stable Diffusion, GANs, VAEs','Generativo · Exemplos'],
  ];
  for (const [piece, label] of matrix) await place(piece, new RegExp('^'+label));
  assert.equal(await text('Correto', { exact: true }).count(), 0);
  await press(button('Conferir respostas'));
  await isVisible(text(/8\/8 associações corretas/));
  await press(button('Sair do modelo e julgar o item'));
  await isVisible(text(/triagem de encomendas/));
  await page.getByRole('radio', { name: 'Certo' }).check();
  await press(button('Confirmar julgamento'));
  await isVisible(text('Você acertou. Gabarito Certo.'));
  await press(button('Voltar ao piloto'));
  const dailyTasks = [
    { id: 'relacionar-blocos-asr', first: /Uma emissora adapta/, later: /Um serviço de legendagem/, marks: ['Errado','Certo'] },
    { id: 'distinguir-influencia', first: /um país condiciona/, later: /prestígio internacional de um programa/, marks: ['Certo','Errado'] },
    { id: 'identificar-ideia-central', first: /plantão itinerante/, later: /oficina redesenhou/, marks: ['Errado','Certo'] },
  ];
  for (const task of dailyTasks) {
    await select(task.id);
    await fit();
    if (task.id === 'relacionar-blocos-asr') {
      await press(button('Predição e correção'));
      await press(button('Transformar áudio em vetores por quadro.'));
      await press(button('Algoritmo fixo, sem treino'));
      await press(button('Verificar no modelo'));
    } else {
      await press(button('Treino de encaixe'));
      if (task.id === 'distinguir-influencia') {
        await place('Um governo muda seu voto para evitar o bloqueio de suas exportações.', /Hard power/);
        await place('Um governo adota um programa cultural estrangeiro que passou a admirar.', /Soft power/);
      } else {
        await isVisible(text(/A biblioteca decidiu facilitar/));
        await place('A biblioteca ampliou o horário de atendimento.', /Detalhe de apoio/);
        await place('A biblioteca facilitou o empréstimo para quem trabalha longe.', /Ideia principal/);
      }
      await press(button('Conferir respostas'));
    }
    await press(button('Sair do modelo e julgar o item'));
    await isVisible(text(task.first));
    assert.equal(await text('Fonte do conceito', {exact:true}).count(), 0);
    await page.getByRole('radio', {name:task.marks[0]}).check();
    await press(button('Confirmar julgamento'));
    await isVisible(text('Você acertou. Gabarito '+task.marks[0]+'.'));
    await press(button('Voltar ao piloto'));
    assert.equal(await button('Julgar item D+7').isDisabled(), true);
  }
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openPilot();
  await isVisible(text(/0\/1 itens C\/E corretos/));
  assert.equal(await button('Julgar item D+7').isDisabled(), true);
  await page.clock.setSystemTime(new Date('2026-12-04T15:00:00Z'));
  await page.clock.runFor(30100);
  await press(button('Julgar item D+7'));
  await isVisible(text(/registrador de ultrassom/));
  assert.equal(await text(/sensor de vibração/).count(), 0);
  await page.getByRole('radio', { name: 'Certo' }).check();
  await press(button('Confirmar julgamento'));
  await isVisible(text('Você acertou. Gabarito Certo.'));
  await press(button('Voltar ao piloto'));
  await isVisible(text(/1\/2 itens C\/E corretos/));
  await press(button('Ver a tentativa D+7'));
  assert.equal(await button('Confirmar julgamento').count(), 0);
  await press(button('Voltar ao piloto'));
  for (const task of dailyTasks) {
    await select(task.id);
    await press(button('Julgar item D+7'));
    await isVisible(text(task.later));
    assert.equal(await text(task.first).count(), 0);
    await page.getByRole('radio', {name:task.marks[1]}).check();
    await press(button('Confirmar julgamento'));
    await isVisible(text('Você acertou. Gabarito '+task.marks[1]+'.'));
    await press(button('Voltar ao piloto'));
  }
  rows.revisao = [{ id: 'rf-1', topico: 'rf-1', mapa: {
    centro: 'Mapa fictício parcial', ramos: [{ id: 'parcial', t: 'Conceito parcial',
      x: { e: 'Descrição fictícia sem cobertura da tarefa.', src: 'Material fictício' } }],
  } }];
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openPilot();
  await isVisible(text(/Revisão necessária/));
  assert.equal(await button('Predição e correção').count(), 0);
  assert.equal(await button('Ver a tentativa inicial').isDisabled(), true);
  assert.equal(await button('Ver a tentativa D+7').isDisabled(), true);
  delete rows.revisao;
  await press(button('Fechar'));
  await isVisible(button('Expandir atalho do Arquiteto'));
  await press(button('Expandir atalho do Arquiteto'));
  await press(page.locator('.qb-architect-launcher').getByRole('button', { name: 'O Arquiteto', exact: true }));
  const dialog = page.getByRole('dialog', { name: /estúdio de aprendizagem ativa/ });
  await isVisible(dialog);
  const modalBounds = await dialog.boundingBox();
  for (const dimension of ['x', 'y', 'width', 'height']) {
    assert.ok(Math.abs(bounds[dimension] - modalBounds[dimension]) <= 1);
  }
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  fixtureUser = personal;
  const personalPage = await context.newPage();
  await personalPage.goto(origin + '/tutor');
  await isVisible(personalPage.getByRole('tab', { name: 'Tutor Socrático' }));
  assert.equal(await personalPage.getByRole('tab', { name: 'Laboratório Visual' }).count(), 0);
  assert.equal(await personalPage.getByRole('tab', { name: 'Flashcards 3D e Scanner' }).count(), 0);
  assert.deepEqual(unexpectedWrites, []);
  process.stdout.write('Chamadas de fundo bloqueadas: '+[...blockedBackground].join(', ')+'.\n');
  assert.deepEqual(errors, []);
  process.stdout.write('Piloto em /tutor: teclado, transferência, D+7 e Navegador em '+viewport.width+' px.\n');
} catch (error) {
  process.stderr.write((await page.locator('body').innerText()).slice(0, 3500)+'\n'+JSON.stringify(errors)+'\n');
  throw error;
} finally {
  await browser.close();
}
