import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const base=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase108-satellite-emergency-connectivity-v1.json"),"utf8"));
const p167=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase167-satellite-exact-device-eligibility-v1.json"),"utf8"));
const p168=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase168-satellite-priority-existing-exact-v1.json"),"utf8"));
const p169=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase169-satellite-legacy-completion-v1.json"),"utf8"));
const js=fs.readFileSync(path.join(root,"assets","phase108-satellite-emergency.js"),"utf8");
const errors=[];
try{new Function(js)}catch(e){errors.push({error:"js_syntax",detail:String(e)})}
const baseIds=new Set((base.records||[]).map(r=>r.id));
const ids168=new Set((p168.records||[]).map(r=>r.id));
const ids169=new Set((p169.records||[]).map(r=>r.id));
const union=new Set([...ids168,...ids169]);
if((p168.records||[]).length!==194)errors.push({error:"phase168_count"});
if((p169.records||[]).length!==356)errors.push({error:"phase169_count"});
if([...ids168].some(id=>ids169.has(id)))errors.push({error:"phase168_169_overlap"});
if(union.size!==550||[...baseIds].some(id=>!union.has(id)))errors.push({error:"legacy_550_not_fully_partitioned",union:union.size});
if((p167.records||[]).length!==22||(p167.records||[]).some(r=>baseIds.has(r.id)))errors.push({error:"phase167_overlay_boundary"});
const find=(name,model)=>p169.records.find(r=>r.model_name===name&&(model===undefined||r.model_number===model));
for(const [name,model,expected] of [
  ["Galaxy S21 5G","SC-51B","message_only"],
  ["Galaxy S22","SC-51C","data_and_message"],
  ["Galaxy Z Flip4","SC-54C","data_and_message"],
  ["arrows We2","F-52E","data_and_message"],
  ["motorola razr 60d","M-51F","message_only"],
  ["iPhone 12",undefined,"not_listed"]
]){
  const r=find(name,model);
  if(!r||r.runtime_mapping?.docomo_starlink_direct_level!==expected)errors.push({error:"docomo_case",name,model,expected,actual:r?.runtime_mapping?.docomo_starlink_direct_level});
}
for(const r of p169.records||[]){
  const au=r.provider_eligibility?.au_starlink_direct;
  const sb=r.provider_eligibility?.softbank_starlink_direct;
  if(au?.source_checked_at!=="2026-08-09"||sb?.source_checked_at!=="2026-08-09")errors.push({error:"legacy_source_date",id:r.id});
  if(au?.freshness!=="carried_forward_not_promoted_to_per_record_reverified"||sb?.freshness!=="carried_forward_not_promoted_to_per_record_reverified")errors.push({error:"freshness_boundary",id:r.id});
  if(r.runtime_mapping?.rakuten_ast_spacemobile_level!=="not_launched")errors.push({error:"rakuten_ast_boundary",id:r.id});
}
for(const marker of ["phase169-satellite-legacy-completion-v1.json","phase169_legacy_completion","phase169_satellite_view","phase169.records||[]"])if(!js.includes(marker))errors.push({error:"missing_runtime_marker",marker});
const result={schema_version:"1.0",release:"phase169-satellite-legacy-completion",checked_at:new Date().toISOString(),legacy_base_records:550,phase168_records:194,phase169_records:356,phase167_new_records:22,total_runtime_records:572,pass:errors.length===0,errors};
fs.writeFileSync(path.join(root,"assets","data","phase169-validation-report-v1.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
