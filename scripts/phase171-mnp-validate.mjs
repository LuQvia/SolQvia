import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const db=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase171-mnp-reservation-deep-master-v1.json"),"utf8"));
const schema=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase171-mnp-reservation-deep-schema-v1.json"),"utf8"));
const js=fs.readFileSync(path.join(root,"assets","phase171-mnp-deep.js"),"utf8");
const pages=[
  "mvno-mnp-reservation-number-directory",
  "docomo-mnp-reservation-number-not-issued",
  "docomo-mnp-preprocedure-mainline-billing-pair-line",
  "docomo-data-only-mnp-plan-change-guide",
  "ahamo-network-pin-forgotten-mnp-guide",
  "au-uq-mnp-reservation-number-guide",
  "softbank-mnp-reservation-number-guide",
  "ymobile-mnp-reservation-number-guide",
  "rakuten-mobile-mnp-reservation-number-guide"
];
const errors=[];
try{new Function(js)}catch(e){errors.push({error:"js_syntax",detail:String(e)})}
if((db.records||[]).length!==72)errors.push({error:"record_count",actual:(db.records||[]).length});
if(new Set((db.records||[]).map(r=>r.id)).size!==72)errors.push({error:"duplicate_ids"});
const current=(db.records||[]).filter(r=>r.current_exact);
const legacy=(db.records||[]).filter(r=>!r.current_exact);
if(current.length!==9)errors.push({error:"current_count",actual:current.length});
if(legacy.length!==63)errors.push({error:"legacy_count",actual:legacy.length});
for(const r of current){
  if(r.freshness?.source_checked_at!=="2026-09-23"||r.freshness?.phase171_rechecked!==true)errors.push({error:"current_freshness",id:r.id});
  if(!(r.official_sources||[]).length)errors.push({error:"current_sources",id:r.id});
}
for(const r of legacy){
  if(r.freshness?.source_checked_at!=="2026-08-08"||r.freshness?.phase171_rechecked!==false)errors.push({error:"legacy_freshness",id:r.id,date:r.freshness?.source_checked_at});
}
const map=new Map((db.records||[]).map(r=>[r.id,r]));
const checks=[
  ["docomo",r=>r.channels?.web?.available===true&&String(r.channels.web.hours).includes("24 hours")],
  ["ahamo",r=>(r.error_states||[]).some(x=>x.code==="44758")],
  ["au",r=>String(r.reservation_number?.delivery).includes("157")],
  ["uq-mobile",r=>r.channels?.phone?.number==="0120-001-659"],
  ["softbank",r=>String(r.channels?.web?.hours).includes("20:00")&&r.reservation_number?.validity_days===15],
  ["ymobile",r=>(r.special_rules||[]).some(x=>String(x).includes("SoftBank/LINEMO"))],
  ["linemo",r=>r.channels?.web?.available===true&&r.channels?.phone?.available===false],
  ["rakuten-mobile",r=>String(r.reservation_number?.issue_timing).includes("same-day")&&(r.channels?.web?.steps||[]).length>=6],
  ["povo2",r=>r.eligibility?.data_only==="not MNP eligible"&&(r.blockers||[]).includes("unpaid charges")]
];
for(const [id,fn] of checks){const r=map.get(id);if(!r||!fn(r))errors.push({error:"representative_case",id});}
for(const marker of ["phase171-mnp-reservation-deep-master-v1.json","current_exact","p171Query","旧証拠日"])if(!js.includes(marker))errors.push({error:"missing_js_marker",marker});
for(const p of pages){
  const file=path.join(root,"ja","technology","smartphone",p,"index.html");
  const html=fs.readFileSync(file,"utf8");
  if((html.match(/data-phase171-mnp/g)||[]).length!==1)errors.push({error:"root_count",page:p});
  if((html.match(/phase171-mnp-deep\.css/g)||[]).length!==1)errors.push({error:"css_count",page:p});
  if((html.match(/phase171-mnp-deep\.js/g)||[]).length!==1)errors.push({error:"js_count",page:p});
}
const result={schema_version:"1.0",release:"phase171-mnp-reservation-deep-master",checked_at:new Date().toISOString(),records:(db.records||[]).length,current_exact:current.length,legacy_carried:legacy.length,pass:errors.length===0,errors};
fs.writeFileSync(path.join(root,"assets","data","phase171-validation-report-v1.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
