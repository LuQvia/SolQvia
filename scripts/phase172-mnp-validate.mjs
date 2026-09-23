import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const db=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase171-mnp-reservation-deep-master-v1.json"),"utf8"));
const js=fs.readFileSync(path.join(root,"assets","phase171-mnp-deep.js"),"utf8");
const pages=[
  "mvno-mnp-reservation-number-directory",
  "iijmio-mnp-reservation-number-guide",
  "mineo-mnp-reservation-number-guide",
  "biglobe-mobile-mnp-reservation-number-guide",
  "nihontsushin-sim-mnp-reservation-number-guide",
  "his-mobile-mnp-reservation-number-guide",
  "nuro-mobile-mnp-reservation-number-guide",
  "aeon-mobile-mnp-reservation-number-guide"
];
const errors=[];
try{new Function(js)}catch(e){errors.push({error:"js_syntax",detail:String(e)})}
if((db.records||[]).length!==72)errors.push({error:"record_count",actual:(db.records||[]).length});
if(new Set((db.records||[]).map(r=>r.id)).size!==72)errors.push({error:"duplicate_ids"});
const current=(db.records||[]).filter(r=>r.current_exact);
const legacy=(db.records||[]).filter(r=>!r.current_exact);
if(current.length!==16)errors.push({error:"current_count",actual:current.length});
if(legacy.length!==56)errors.push({error:"legacy_count",actual:legacy.length});
const ids=[
  "legacy-01-iijmio",
  "legacy-02-mineo",
  "legacy-03-biglobe",
  "legacy-05-sim",
  "legacy-06-his",
  "legacy-04-nuro",
  "legacy-14-provider"
];
const map=new Map((db.records||[]).map(r=>[r.id,r]));
for(const id of ids){
  const r=map.get(id);
  if(!r||!r.current_exact)errors.push({error:"upgrade_missing",id});
  if(r?.freshness?.source_checked_at!=="2026-09-23"||r?.freshness?.phase172_rechecked!==true)errors.push({error:"freshness",id});
  if(!(r?.official_sources||[]).length)errors.push({error:"sources",id});
}
const iij=map.get("legacy-01-iijmio");
if(!String(iij?.reservation_number?.issue_timing).includes("最大4日"))errors.push({error:"iij_issue_time"});
if(iij?.eligibility?.data_only!=="not MNP eligible")errors.push({error:"iij_data_only"});
const mineo=map.get("legacy-02-mineo");
if(!String(mineo?.channels?.web?.hours).includes("9:02〜20:59"))errors.push({error:"mineo_time_window"});
const big=map.get("legacy-03-biglobe");
if(!String(big?.reservation_number?.issue_timing).includes("翌日まで"))errors.push({error:"biglobe_issue_time"});
if(!(big?.special_rules||[]).some(x=>String(x).includes("シェアSIM")))errors.push({error:"biglobe_share_sim"});
const jci=map.get("legacy-05-sim");
if(!String(jci?.reservation_number?.issue_timing).includes("2日"))errors.push({error:"jci_issue_time"});
const his=map.get("legacy-06-his");
if(!String(his?.reservation_number?.issue_timing).includes("固定の発行日数"))errors.push({error:"his_fixed_time_boundary"});
const nuro=map.get("legacy-04-nuro");
if(!String(nuro?.reservation_number?.issue_timing).includes("1〜2日"))errors.push({error:"nuro_issue_time"});
if(!String(nuro?.reservation_number?.reissue).includes("延長"))errors.push({error:"nuro_reissue_boundary"});
const aeon=map.get("legacy-14-provider");
if(!String(aeon?.reservation_number?.issue_timing).includes("8:00"))errors.push({error:"aeon_cutoff"});
if(!(aeon?.blockers||[]).includes("利用料金の一部または全部が未払い"))errors.push({error:"aeon_unpaid"});
for(const p of pages){
  const html=fs.readFileSync(path.join(root,"ja","technology","smartphone",p,"index.html"),"utf8");
  if((html.match(/data-phase171-mnp/g)||[]).length!==1)errors.push({error:"panel_count",page:p});
  if((html.match(/phase171-mnp-deep\.css/g)||[]).length!==1)errors.push({error:"css_count",page:p});
  if((html.match(/phase171-mnp-deep\.js/g)||[]).length!==1)errors.push({error:"js_count",page:p});
  if(!html.includes('data-release="phase172"'))errors.push({error:"release_marker",page:p});
}
const mineoHtml=fs.readFileSync(path.join(root,"ja","technology","smartphone","mineo-mnp-reservation-number-guide","index.html"),"utf8");
if(mineoHtml.includes("すべての契約状態での発行所要時間を一律に保証する記載は確認できませんでした"))errors.push({error:"mineo_stale_static"});
const hisHtml=fs.readFileSync(path.join(root,"ja","technology","smartphone","his-mobile-mnp-reservation-number-guide","index.html"),"utf8");
if(hisHtml.includes("ドコモ回線は通常当日〜2日程度")||hisHtml.includes("ソフトバンク回線は4日程度"))errors.push({error:"his_stale_timing"});
if(!hisHtml.includes("USIM番号"))errors.push({error:"his_usim_missing"});

const result={
  schema_version:"1.0",
  release:"phase172-mvno-mnp-current-exact-wave1",
  checked_at:new Date().toISOString(),
  total_records:(db.records||[]).length,
  current_exact:current.length,
  legacy_carried:legacy.length,
  phase172_upgraded:ids.length,
  pass:errors.length===0,
  errors
};
fs.writeFileSync(path.join(root,"assets","data","phase172-validation-report-v1.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
