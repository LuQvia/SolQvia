import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const rules=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase174-mnp-diagnosis-rules-v1.json"),"utf8"));
const master=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase171-mnp-reservation-deep-master-v1.json"),"utf8"));
const js=fs.readFileSync(path.join(root,"assets","phase174-mnp-diagnosis.js"),"utf8");
const html=fs.readFileSync(path.join(root,"ja","technology","smartphone","mvno-mnp-reservation-number-directory","index.html"),"utf8");
const errors=[];
try{new Function(js)}catch(e){errors.push({error:"js_syntax",detail:String(e)})}

const current=(master.records||[]).filter(r=>r.current_exact);
if(current.length!==23)errors.push({error:"master_current_count",actual:current.length});
if((rules.providers||[]).length!==23)errors.push({error:"rule_provider_count",actual:(rules.providers||[]).length});
if(new Set((rules.providers||[]).map(r=>r.id)).size!==23)errors.push({error:"duplicate_provider_ids"});
const currentIds=new Set(current.map(r=>r.id));
for(const p of rules.providers||[]){
  if(!currentIds.has(p.id))errors.push({error:"non_current_provider",id:p.id});
  if(p.freshness?.source_checked_at!=="2026-09-23")errors.push({error:"freshness",id:p.id});
  if(!(p.official_sources||[]).length)errors.push({error:"missing_sources",id:p.id});
}
const map=new Map((rules.providers||[]).map(r=>[r.id,r]));
if(map.get("docomo")?.contract?.data_only!=="verify")errors.push({error:"docomo_data_verify_boundary"});
if(map.get("linemo")?.contract?.data_only!=="ineligible")errors.push({error:"linemo_data_ineligible"});
if(map.get("legacy-07-qt")?.one_stop?.state!=="not_supported_or_number_required")errors.push({error:"qt_two_stop_boundary"});
if(map.get("legacy-22-j-com-mobile")?.one_stop?.state!=="scope_limited")errors.push({error:"jcom_scope_limited"});
if(!String(map.get("legacy-22-j-com-mobile")?.issue_timing).includes("推測しない"))errors.push({error:"jcom_unknown_not_preserved"});
const lm=map.get("legacy-09-linksmate");
if(!lm?.real_account_observation)errors.push({error:"linksmate_observation_missing"});
if(!lm?.issue_rules?.some(r=>r.category==="new_contract_wait"))errors.push({error:"linksmate_new_contract"});
if(!lm?.issue_rules?.some(r=>r.category==="multi_line_group"))errors.push({error:"linksmate_group"});
if(!String(map.get("legacy-13-libmo")?.issue_timing).includes("翌営業日"))errors.push({error:"libmo_business_day"});
for(const cat of ["unpaid","sim_reissue","new_contract_wait","sms_otp"]){
  if(!map.get("povo2")?.issue_rules?.some(r=>r.category===cat))errors.push({error:"povo_rule",cat});
}
if(!map.get("legacy-10-y-u-mobile")?.issue_rules?.some(r=>r.category==="payment_method"))errors.push({error:"yu_payment"});
if(!map.get("ahamo")?.issue_rules?.some(r=>r.category==="representative_pair"))errors.push({error:"ahamo_representative"});
if(!map.get("au")?.issue_rules?.some(r=>r.category==="sms_otp"))errors.push({error:"au_sms"});
if(rules.rule_count!==(rules.providers||[]).reduce((n,p)=>n+(p.issue_rules||[]).length,0))errors.push({error:"rule_count"});

for(const marker of ["contract.data_only==='ineligible'","contract.data_only==='verify'","one_stop.state==='not_supported_or_number_required'","real_account_observation","current-exact"]){
  if(!js.includes(marker))errors.push({error:"js_boundary",marker});
}
if((html.match(/data-phase174-mnp-diagnosis/g)||[]).length!==1)errors.push({error:"root_count"});
if((html.match(/phase174-mnp-diagnosis\.css/g)||[]).length!==1)errors.push({error:"css_count"});
if((html.match(/phase174-mnp-diagnosis\.js/g)||[]).length!==1)errors.push({error:"js_count"});
if(!html.includes('data-release="phase174"'))errors.push({error:"release_marker"});

const result={
  schema_version:"1.0",
  release:"phase174-mnp-diagnosis-engine",
  checked_at:new Date().toISOString(),
  current_exact_providers:(rules.providers||[]).length,
  normalized_issue_rules:(rules.providers||[]).reduce((n,p)=>n+(p.issue_rules||[]).length,0),
  taxonomy_items:(rules.taxonomy||[]).length,
  pass:errors.length===0,
  errors
};
fs.writeFileSync(path.join(root,"assets","data","phase174-validation-report-v1.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
