import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const db=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase171-mnp-reservation-deep-master-v1.json"),"utf8"));
const schema=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase171-mnp-reservation-deep-schema-v1.json"),"utf8"));
const js=fs.readFileSync(path.join(root,"assets","phase171-mnp-deep.js"),"utf8");
const pages=[
  "mvno-mnp-reservation-number-directory",
  "nifmo-mnp-reservation-number-guide",
  "ocn-mobile-one-mnp-reservation-number-guide",
  "jcom-mobile-mnp-reservation-number-guide",
  "qtmobile-mnp-reservation-number-guide",
  "linksmate-mnp-reservation-number-guide",
  "yu-mobile-mnp-reservation-number-guide",
  "libmo-mnp-reservation-number-guide"
];
const errors=[];
try{new Function(js)}catch(e){errors.push({error:"js_syntax",detail:String(e)})}

if((db.records||[]).length!==72)errors.push({error:"record_count",actual:(db.records||[]).length});
if(new Set((db.records||[]).map(r=>r.id)).size!==72)errors.push({error:"duplicate_ids"});
const current=(db.records||[]).filter(r=>r.current_exact);
const legacy=(db.records||[]).filter(r=>!r.current_exact);
if(current.length!==23)errors.push({error:"current_count",actual:current.length});
if(legacy.length!==49)errors.push({error:"legacy_count",actual:legacy.length});

const ids=[
  "legacy-11-nifmo",
  "legacy-12-ocn-one",
  "legacy-22-j-com-mobile",
  "legacy-07-qt",
  "legacy-09-linksmate",
  "legacy-10-y-u-mobile",
  "legacy-13-libmo"
];
const map=new Map((db.records||[]).map(r=>[r.id,r]));
for(const id of ids){
  const r=map.get(id);
  if(!r||!r.current_exact)errors.push({error:"upgrade_missing",id});
  if(r?.freshness?.source_checked_at!=="2026-09-23")errors.push({error:"freshness",id});
  if(!(r?.official_sources||[]).length)errors.push({error:"sources",id});
}

const nif=map.get("legacy-11-nifmo");
if(!String(nif?.reservation_number?.issue_timing).includes("1〜2日"))errors.push({error:"nifmo_issue"});
if(nif?.eligibility?.data_only!=="not MNP eligible"||nif?.eligibility?.sms_only!=="not MNP eligible")errors.push({error:"nifmo_data_sms"});

const ocn=map.get("legacy-12-ocn-one");
if(!String(ocn?.reservation_number?.issue_timing).includes("3営業日"))errors.push({error:"ocn_issue"});
if(ocn?.one_stop?.status!=="supported")errors.push({error:"ocn_onestop"});

const jcom=map.get("legacy-22-j-com-mobile");
if(jcom?.freshness?.status!=="current_exact_scope_limited")errors.push({error:"jcom_scope"});
if(!String(jcom?.reservation_number?.issue_timing).includes("推測しない"))errors.push({error:"jcom_unknown_boundary"});

const qt=map.get("legacy-07-qt");
if(qt?.reservation_number?.validity_days!==14)errors.push({error:"qt_validity"});
if(!String(qt?.one_stop?.status).includes("two_stop_only"))errors.push({error:"qt_two_stop"});

const lm=map.get("legacy-09-linksmate");
if(!lm?.real_account_observation)errors.push({error:"linksmate_observation_missing"});
if(!String(lm?.channels?.web?.hours).includes("翌日09:00"))errors.push({error:"linksmate_next_day_9"});
if(!(lm?.blockers||[]).some(x=>String(x).includes("複数同時にMNP転出不可")))errors.push({error:"linksmate_group_blocker"});
if(!(lm?.special_rules||[]).some(x=>String(x).includes("別グループ")))errors.push({error:"linksmate_cross_group"});
if(!(lm?.real_account_observation?.findings||[]).some(x=>String(x).includes("即日")))errors.push({error:"linksmate_same_day_observation"});

const yu=map.get("legacy-10-y-u-mobile");
if(!String(yu?.reservation_number?.issue_timing).includes("最大2日"))errors.push({error:"yu_issue"});
if(!(yu?.blockers||[]).some(x=>String(x).includes("支払い方法が無効")))errors.push({error:"yu_payment"});

const lib=map.get("legacy-13-libmo");
if(!String(lib?.reservation_number?.issue_timing).includes("翌営業日"))errors.push({error:"libmo_issue"});
if(!(lib?.blockers||[]).some(x=>String(x).includes("8日以内")))errors.push({error:"libmo_8day"});

if(schema.schema_version!=="1.1")errors.push({error:"schema_version"});
if(!schema.field_notes?.real_account_observation)errors.push({error:"observation_schema_missing"});

for(const marker of ["Phase173 · MNP Reservation Deep Master","real_account_observation","SolQvia 実利用観測"]){
  if(!js.includes(marker))errors.push({error:"js_marker",marker});
}

for(const p of pages){
  const html=fs.readFileSync(path.join(root,"ja","technology","smartphone",p,"index.html"),"utf8");
  if((html.match(/data-phase171-mnp/g)||[]).length!==1)errors.push({error:"panel_count",page:p});
  if((html.match(/phase171-mnp-deep\.css/g)||[]).length!==1)errors.push({error:"css_count",page:p});
  if((html.match(/phase171-mnp-deep\.js/g)||[]).length!==1)errors.push({error:"js_count",page:p});
  if(!html.includes('data-release="phase173"'))errors.push({error:"release_marker",page:p});
}

const lmHtml=fs.readFileSync(path.join(root,"ja","technology","smartphone","linksmate-mnp-reservation-number-guide","index.html"),"utf8");
if(lmHtml.includes("公式サポートでは発行に1〜2日程度"))errors.push({error:"linksmate_stale_issue"});
if(!lmHtml.includes("SolQvia実利用観測"))errors.push({error:"linksmate_static_observation_missing"});

const result={
  schema_version:"1.0",
  release:"phase173-mvno-mnp-current-exact-wave2",
  checked_at:new Date().toISOString(),
  total_records:(db.records||[]).length,
  current_exact:current.length,
  legacy_carried:legacy.length,
  phase173_upgraded:ids.length,
  real_account_observation_records:(db.records||[]).filter(r=>r.real_account_observation).length,
  pass:errors.length===0,
  errors
};
fs.writeFileSync(path.join(root,"assets","data","phase173-validation-report-v1.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
