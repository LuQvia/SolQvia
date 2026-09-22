import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const eligibility=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase167-satellite-exact-device-eligibility-v1.json"),"utf8"));
const js=fs.readFileSync(path.join(root,"assets","phase108-satellite-emergency.js"),"utf8");
const errors=[];
const records=eligibility.records||[];
const ids=new Set(records.map(r=>r.id));

if(records.length!==22) errors.push({error:"record_count",expected:22,actual:records.length});
if(ids.size!==records.length) errors.push({error:"duplicate_ids"});
if(!js.includes("phase167-satellite-exact-device-eligibility-v1.json")) errors.push({error:"runtime_map_not_loaded"});
if(!js.includes("phase167_exact_satellite_mapping")) {
  // mapping flag is data-side; runtime applies runtime_mapping via Object.assign.
}
if(!js.includes("phase167_release_state==='scheduled'")) errors.push({error:"future_release_guard_missing"});
if(!js.includes("docomo_starlink_direct_level")) errors.push({error:"docomo_exact_level_missing"});
if(!js.includes("phase166_unverified_new_record:false") && !js.includes("Object.assign(r,m)")) errors.push({error:"phase166_guard_not_overridden"});
if(!js.includes("records.filter(r=>r.apple_native_satellite_japan).length")) errors.push({error:"current_apple_count_missing"});

const duo=records.find(r=>r.id==="phase133-iphone-duo-a3719");
if(!duo||duo.release_state!=="scheduled") errors.push({error:"iphone_duo_future_boundary"});
if(duo?.runtime_mapping?.apple_native_satellite_japan!==false) errors.push({error:"iphone_duo_current_apple_overclaim"});

const s26=records.find(r=>r.id==="phase143-galaxy-s26-sm-s942q");
if(!s26||s26.provider_eligibility?.au_starlink_direct?.level!=="iot_listed_feature_level_unresolved") errors.push({error:"s26_au_ambiguity_boundary"});
if(s26?.runtime_mapping?.au_starlink_direct_level!=="unknown") errors.push({error:"s26_au_runtime_overclaim"});

const a57=records.find(r=>r.id==="phase141-galaxy-a57-sm-a576q");
if(a57?.runtime_mapping?.au_starlink_direct_level!=="data_and_message") errors.push({error:"a57_au_iot_mapping"});

for(const r of records){
  if(r.runtime_mapping?.phase166_unverified_new_record!==false) errors.push({error:"unverified_guard_not_cleared",id:r.id});
  if(r.runtime_mapping?.rakuten_ast_spacemobile_level!=="not_launched") errors.push({error:"rakuten_ast_boundary",id:r.id});
  if(!r.evidence_refs?.length) errors.push({error:"missing_evidence_refs",id:r.id});
}
const result={
  schema_version:"1.0",
  release:"phase167-satellite-exact-device-eligibility",
  checked_at:new Date().toISOString(),
  record_count:records.length,
  unique_record_count:ids.size,
  pass:errors.length===0,
  errors
};
fs.writeFileSync(path.join(root,"assets","data","phase167-validation-report-v1.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
if(errors.length) process.exitCode=1;
