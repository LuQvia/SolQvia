import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "assets", "data");
const year = process.argv[2] || "2026";
const outPath = process.argv[3] || path.join(dataDir, `phase142-${year}-normalization-audit-v1.json`);

const readJson = p => JSON.parse(fs.readFileSync(p, "utf8"));
const norm = s => String(s ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
const phaseNo = name => Number((name.match(/^phase(\d+)/) || [0, 0])[1]);

function deepMerge(a, b) {
  if (!b || typeof b !== "object" || Array.isArray(b)) return b;
  if (!a || typeof a !== "object" || Array.isArray(a)) a = {};
  for (const [k, v] of Object.entries(b)) {
    a[k] = v && typeof v === "object" && !Array.isArray(v) ? deepMerge(a[k], v) : v;
  }
  return a;
}

const base = readJson(path.join(dataDir, "phase110-device-passport-v1.json"));
const overlays = fs.readdirSync(dataDir)
  .filter(n => /^phase\d+-current-device-overlay-v1\.json$/.test(n))
  .sort((a, b) => phaseNo(a) - phaseNo(b))
  .map(n => readJson(path.join(dataDir, n)));

const external = fs.readdirSync(dataDir)
  .filter(n => /^phase\d+-external-field-evidence-v1\.json$/.test(n))
  .sort((a, b) => phaseNo(a) - phaseNo(b))
  .flatMap(n => readJson(path.join(dataDir, n)).records || []);

const realPath = path.join(dataDir, "phase131-solqvia-real-device-evidence-v1.json");
const real = fs.existsSync(realPath) ? (readJson(realPath).records || []) : [];

const map = new Map(base.records.map(r => [r.id, r]));
for (const overlay of overlays) {
  for (const record of overlay.records || []) {
    if (map.has(record.id)) {
      map.set(record.id, deepMerge(JSON.parse(JSON.stringify(map.get(record.id))), record));
    } else {
      map.set(record.id, record);
    }
  }
}

const hasExternal = r => external.some(x =>
  (x.model_names || []).some(n => norm(n) === norm(r.model_name)) &&
  (!(x.model_numbers || []).length || (x.model_numbers || []).some(n => norm(n) === norm(r.model_number)))
);
const hasReal = r => real.some(x =>
  (x.model_number && r.model_number && norm(x.model_number) === norm(r.model_number)) ||
  norm(x.model_name) === norm(r.model_name)
);
const genericSim = s => !s || /周波数表では確認不可|個別機種の公式仕様ページで最終確認/i.test(s);
const carriers = ["NTTドコモ", "au", "SoftBank", "楽天モバイル"];
const weights = {
  model_number: 25,
  sim_esim: 20,
  sim_flags: 10,
  dual_sim_exact: 15,
  lte_bands: 10,
  nr_bands: 10,
  four_carrier_fit: 5,
  usb: 3,
  os_update: 2,
  official_source_depth: 5
};

const records = [...map.values()]
  .filter(r => String(r.release_date || "").startsWith(year))
  .map(r => {
    const gaps = [];
    const modelNumber = String(r.model_number || "").trim();
    const sim = String(r.network?.sim_esim || "").trim();
    if (!modelNumber) gaps.push("model_number");
    if (genericSim(sim)) gaps.push("sim_esim");
    if (r.network?.supports_esim !== true && r.network?.supports_physical_sim !== true) gaps.push("sim_flags");
    if (!(r.dual_sim?.exact_dual_esim || r.dual_sim?.exact_dual_physical || r.dual_sim?.exact_dual_mixed)) gaps.push("dual_sim_exact");
    if (!r.network?.lte_bands) gaps.push("lte_bands");
    if (!r.network?.nr_bands) gaps.push("nr_bands");
    if (carriers.some(c => !r.network?.fit?.[c])) gaps.push("four_carrier_fit");
    if (!r.peripheral?.port_connector) gaps.push("usb");
    if (!r.os_update?.platform) gaps.push("os_update");
    if ((r.evidence?.source_count || 0) < 2) gaps.push("official_source_depth");
    const structuralScore = gaps.reduce((sum, gap) => sum + (weights[gap] || 0), 0);
    return {
      id: r.id,
      model: r.model_name,
      model_number: modelNumber,
      carrier: r.original_carrier,
      release_date: r.release_date,
      structural_score: structuralScore,
      gaps,
      external_runtime_evidence: hasExternal(r),
      solqvia_real_device: hasReal(r)
    };
  })
  .sort((a, b) => b.structural_score - a.structural_score || a.model.localeCompare(b.model, "ja"));

const familyMap = new Map();
for (const r of records) {
  if (!familyMap.has(r.model)) {
    familyMap.set(r.model, {
      model: r.model,
      records: 0,
      incomplete_records: 0,
      missing_model_numbers: 0,
      external_runtime_records: 0,
      solqvia_real_records: 0,
      score_sum: 0,
      max_record_score: 0
    });
  }
  const f = familyMap.get(r.model);
  f.records++;
  f.score_sum += r.structural_score;
  f.max_record_score = Math.max(f.max_record_score, r.structural_score);
  if (r.structural_score > 0) f.incomplete_records++;
  if (r.gaps.includes("model_number")) f.missing_model_numbers++;
  if (r.external_runtime_evidence) f.external_runtime_records++;
  if (r.solqvia_real_device) f.solqvia_real_records++;
}

const families = [...familyMap.values()]
  .map(f => ({
    ...f,
    priority_score:
      f.score_sum +
      f.incomplete_records * 5 +
      (f.external_runtime_records === 0 ? 5 : 0) +
      (f.solqvia_real_records === 0 ? 5 : 0)
  }))
  .filter(f => f.incomplete_records > 0)
  .sort((a, b) => b.priority_score - a.priority_score || a.model.localeCompare(b.model, "ja"));

const output = {
  schema_version: "1.0",
  release: "phase142-2026-normalization-audit",
  generated_at: new Date().toISOString(),
  year,
  scoring_weights: weights,
  summary: {
    total_year_records: records.length,
    incomplete_records: records.filter(r => r.structural_score > 0).length,
    complete_by_structural_rules: records.filter(r => r.structural_score === 0).length,
    families_with_gaps: families.length,
    external_runtime_records: records.filter(r => r.external_runtime_evidence).length,
    solqvia_real_device_records: records.filter(r => r.solqvia_real_device).length
  },
  family_priority: families,
  record_backlog: records.filter(r => r.structural_score > 0),
  rules: [
    "Missing exact model number is a high-priority structural gap.",
    "Generic SIM placeholders are distinct from known nanoSIM/eSIM support.",
    "Dual-SIM exactness is evaluated separately from basic SIM/eSIM support.",
    "Band tables and carrier-fit records are structural evidence, not runtime guarantees.",
    "External field tests and SolQvia-owned real-device evidence remain separate."
  ]
};

fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
console.log(outPath);
