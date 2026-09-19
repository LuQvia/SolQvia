import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const gates=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase165-execution-gates-v1.json"),"utf8"));
const freshness=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase165-public-index-freshness-audit-v1.json"),"utf8"));
const visual=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase165-visual-qa-matrix-v1.json"),"utf8"));
const p153=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase153-gsc-data-availability-v1.json"),"utf8"));
const p162=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase162-real-device-captures-v1.json"),"utf8"));
const p164=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase164-planned-captures-v1.json"),"utf8"));
const ja=fs.readFileSync(path.join(root,"ja","technology","smartphone","device-passport","index.html"),"utf8");
const en=fs.readFileSync(path.join(root,"en","technology","smartphone","device-passport","index.html"),"utf8");

const errors=[];
const gateById=new Map((gates.gates||[]).map(x=>[x.id,x]));

for(const id of ["gsc_measurement","public_index_freshness","visual_qa","real_device_execution","seo_evidence_feedback"]){
  if(!gateById.has(id))errors.push({error:"missing_gate",id});
}

if(!ja.includes("Phase163 · 3-Layer Device Passport"))errors.push({error:"ja_not_phase163"});
if(!en.includes("Phase163 · 3-Layer Device Passport"))errors.push({error:"en_not_phase163"});
if(!ja.includes('id="p110Count">572件'))errors.push({error:"ja_main_count_not_572"});
if(!en.includes('id="p110Count">572 records'))errors.push({error:"en_main_count_not_572"});
if(/id="p110Count">550/.test(ja)||/id="p110Count">550/.test(en))errors.push({error:"current_main_contains_stale_550_search_count"});

if((p162.records||[]).length!==2)errors.push({error:"unexpected_phase162_completed_capture_count",value:(p162.records||[]).length});
if((p164.plans||[]).length!==6)errors.push({error:"unexpected_phase164_plan_count",value:(p164.plans||[]).length});

if(gateById.get("gsc_measurement")?.status!=="blocked_input_missing")errors.push({error:"gsc_gate_status"});
if(gateById.get("visual_qa")?.status!=="pending_browser_render")errors.push({error:"visual_gate_status"});
if(gateById.get("real_device_execution")?.status!=="ready_waiting_for_observation")errors.push({error:"capture_gate_status"});
if(gateById.get("seo_evidence_feedback")?.status!=="waiting_for_validated_capture")errors.push({error:"seo_feedback_gate_status"});

if(visual.status!=="pending_browser_render")errors.push({error:"visual_matrix_must_remain_pending"});
if((visual.breakpoints||[]).map(x=>x.width_px).join(",")!=="390,768,1440")errors.push({error:"visual_breakpoints_changed"});
if((visual.scenarios||[]).length!==5)errors.push({error:"visual_scenario_count",value:(visual.scenarios||[]).length});

if(freshness.repository_main?.ja_device_passport?.search_count_text!=="572件")errors.push({error:"freshness_ja_main_count"});
if(freshness.searchable_crawl_snapshot?.ja_device_passport?.search_ui_count!==550)errors.push({error:"freshness_stale_snapshot_marker"});

// Phase153 remains the authoritative declaration for raw GSC availability.
const serialized153=JSON.stringify(p153);
if(!/2026-09-08/.test(serialized153))errors.push({error:"phase153_safe_baseline_date_not_found"});

const result={
  schema_version:"1.0",
  release:"phase165-measurement-execution-gates",
  checked_at:new Date().toISOString(),
  gates:(gates.gates||[]).length,
  phase162_completed_captures:(p162.records||[]).length,
  phase164_planned_campaigns:(p164.plans||[]).length,
  visual_breakpoints:(visual.breakpoints||[]).length,
  visual_scenarios:(visual.scenarios||[]).length,
  pass:errors.length===0,
  errors
};
fs.writeFileSync(path.join(root,"assets","data","phase165-validation-report-v1.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
