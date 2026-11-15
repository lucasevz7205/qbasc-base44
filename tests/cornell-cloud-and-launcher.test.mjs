/* global URL */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cornellSignature, cornellDraftKey, reconcileCornell, shouldCreateCornellVersion } from "../src/lib/cornell-logic.js";
import { parseCornellGemini } from "../src/lib/cornell-gemini.js";
import { clampLauncherPosition, defaultLauncherPosition } from "../src/lib/architect-launcher-position.js";

test("migra rascunho legado quando não existe nota remota", () => {
  const legacy = { notes: "anotação antiga", cues: "pista", summary: "síntese" };
  const merged = reconcileCornell(null, null, legacy);
  assert.equal(merged.source, "legacy");
  assert.equal(merged.importFromBrowser, true);
  assert.deepEqual(merged.data, legacy);
  assert.equal(merged.recovery, null);
});
test("conta e tópico são parte da chave Cornell", () => {
  assert.notEqual(cornellDraftKey("a", "dc-1"), cornellDraftKey("b", "dc-1"));
  assert.notEqual(cornellDraftKey("a", "dc-1"), cornellDraftKey("a", "dc-2"));
  assert.throws(() => cornellDraftKey("", "dc-1"));
});
test("conflito mantém a nuvem e expõe cópia local recuperável", () => {
  const cloud = { notes: "registrado na nuvem", cues: "pistas A", summary: "" };
  const browser = { notes: "rascunho que não pode sumir", cues: "pistas B", summary: "recuperável" };
  const result = reconcileCornell(cloud, browser, null);
  assert.deepEqual(result.data, cloud);
  assert.deepEqual(result.recovery, browser);
  assert.equal(result.importFromBrowser, false);
  assert.notEqual(cornellSignature(result.data), cornellSignature(result.recovery));
});
test("versões não aparecem como conflitos se não há diferenças", () => {
  const data = { notes: "x", cues: "y", summary: "z" };
  assert.equal(reconcileCornell(data, data, data).recovery, null);
});
test("snapshots Cornell periódicos", () => {
  const now = Date.parse("2026-11-15T15:00:00Z");
  assert.equal(shouldCreateCornellVersion(null, now), true);
  assert.equal(shouldCreateCornellVersion("2026-11-15T14:59:00Z", now), false);
  assert.equal(shouldCreateCornellVersion("2026-11-15T14:40:00Z", now), true);
});
test("parser Gemini valida resposta e rejeita análise malformada", () => {
  const payload = '{"cues":["Qual a regra?","Qual a exceção?"],"summary":"Síntese curta."}';
  const result = parseCornellGemini(payload);
  assert.deepEqual(result.cues, ["Qual a regra?", "Qual a exceção?"]);
  assert.equal(result.summary, "Síntese curta.");
  assert.throws(() => parseCornellGemini("explicação sem estrutura"), /estruturadas/);
  assert.throws(() => parseCornellGemini('{"cues":["uma"],"summary":""}'), /incompleta/);
});
test("atalho pode ser arrastado mas fica dentro da tela", () => {
  const view = { width: 1200, height: 800 };
  const size = { width: 200, height: 52 };
  assert.deepEqual(clampLauncherPosition({ x: -900, y: -500 }, view, size), { x: 12, y: 80 });
  assert.deepEqual(clampLauncherPosition({ x: 5000, y: 4000 }, view, size), { x: 988, y: 736 });
  const home = defaultLauncherPosition(view, size);
  assert.equal(home.x, 16);
  assert.ok(home.y > 250 && home.y < 600);
});
test("dimensões móveis mantêm atalho visível", () => {
  assert.deepEqual(clampLauncherPosition({ x: 400, y: 1200 }, { width: 320, height: 580 }, { width: 190, height: 52 }), { x: 118, y: 516 });
});
test("Cornell usa dados na nuvem, preservando original local", () => {
  const component = readFileSync(new URL("../src/components/qb/architect/CornellNotebook.jsx", import.meta.url), "utf8");
  const service = readFileSync(new URL("../src/lib/cornell-storage.js", import.meta.url), "utf8");
  const studio = readFileSync(new URL("../src/components/qb/architect/ArchitectStudio.jsx", import.meta.url), "utf8");
  assert.match(component, /useAuth\(\)/);
  assert.match(component, /localStorage\.getItem/);
  assert.match(component, /localStorage\.setItem/);
  assert.match(component, /reconcileCornell\(row, cached, legacy\)/);
  assert.match(component, /saveCornellNote\(/);
  assert.match(component, /createCornellVersion\(/);
  assert.match(component, /Falha ao salvar na nuvem/);
  assert.match(service, /CornellNote\.filter/);
  assert.match(service, /CornellNote\.update/);
  assert.match(service, /CornellNoteVersion\.create/);
  assert.match(studio, /<CornellNotebook topicId=\{topic\?\.id \|\| ''\}/);
  assert.doesNotMatch(component, /localStorage\.removeItem/);
});
test("Cornell Gemini não usa InvokeLLM Base44", () => {
  const src = readFileSync(new URL("../src/lib/server-fns.js", import.meta.url), "utf8");
  const from = src.indexOf("export const generateCornellCues");
  const to = src.indexOf("const ExtractMaterialSchema", from);
  const fn = src.slice(from, to);
  assert.ok(from >= 0 && to > from);
  assert.match(fn, /\.middleware\(\[requireUser\]\)/);
  assert.match(fn, /context\.user\?\.role !== "admin"/);
  assert.match(fn, /invokeGeminiTutor/);
  assert.match(fn, /parseCornellGemini/);
  assert.match(fn, /secrets\.get\("Arquiteto"\)/);
  assert.doesNotMatch(fn, /Core\.InvokeLLM/);
});
test("atalho abre chat e aceita arrastar com mouse, toque e teclado", () => {
  const src = readFileSync(new URL("../src/components/qb/architect/ArchitectLauncher.jsx", import.meta.url), "utf8");
  for (const item of ["onPointerDown", "onPointerMove", "onPointerUp", "onPointerCancel", "onKeyDown", "setPointerCapture", "localStorage.setItem", "onClick={onOpen}"]) {
    assert.ok(src.includes(item), "Faltou " + item);
  }
  assert.match(src, /defaultLauncherPosition\(viewport\(\), size\)/);
  assert.match(src, /touchAction: 'none'/);
});
test("entidades Cornell restringem operações a admin", () => {
  for (const entity of ["CornellNote", "CornellNoteVersion"]) {
    const raw = readFileSync(new URL("../base44/entities/" + entity + ".jsonc", import.meta.url), "utf8");
    const schema = JSON.parse(raw);
    assert.equal(schema.name, entity);
    assert.deepEqual(schema.rls.read.user_condition, { role: "admin" });
    assert.deepEqual(schema.rls.create.user_condition, { role: "admin" });
    assert.equal(schema.rls.delete, false);
    assert.ok(schema.required.includes("owner_id"));
    assert.ok(schema.required.includes("topic_id"));
  }
});
