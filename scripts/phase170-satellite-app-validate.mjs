import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const matrix=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase170-satellite-app-feature-matrix-v1.json"),"utf8"));
const p167=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase167-satellite-exact-device-eligibility-v1.json"),"utf8"));
const p168=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase168-satellite-priority-existing-exact-v1.json"),"utf8"));
const p169=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase169-satellite-legacy-completion-v1.json"),"utf8"));
const js=fs.readFileSync(path.join(root,"assets","phase170-satellite-app-feature.js"),"utf8");
const ja=fs.readFileSync(path.join(root,"ja","technology","smartphone","satellite-emergency-connectivity-diagnosis","index.html"),"utf8");
const en=fs.readFileSync(path.join(root,"en","technology","smartphone","satellite-emergency-connectivity-diagnosis","index.html"),"utf8");
const errors=[];
try{new Function(js)}catch(e){errors.push({error:"phase170_js_syntax",detail:String(e)})}

const apps=matrix.app_catalog||[];
const appIds=new Set(apps.map(a=>a.id));
if(appIds.size!==apps.length)errors.push({error:"duplicate_app_catalog_ids"});

const serviceMap=new Map((matrix.services||[]).map(s=>[s.id,s]));
for(const id of ["au_starlink_direct","docomo_starlink_direct","softbank_starlink_direct","apple_native_satellite","google_pixel_satellite_sos","rakuten_ast_spacemobile"]){
  if(!serviceMap.has(id))errors.push({error:"missing_service",id});
}
for(const svc of matrix.services||[]){
  for(const platform of ["ios","android"]){
    const ids=svc.apps?.[platform]||[];
    if(new Set(ids).size!==ids.length)errors.push({error:"duplicate_app_id",service:svc.id,platform});
    for(const id of ids)if(!appIds.has(id))errors.push({error:"unknown_app_id",service:svc.id,platform,id});
  }
  for(const id of Object.keys(svc.apps?.overrides||{}))if(!appIds.has(id))errors.push({error:"unknown_override_id",service:svc.id,id});
}
const au=serviceMap.get("au_starlink_direct");
const docomo=serviceMap.get("docomo_starlink_direct");
const softbank=serviceMap.get("softbank_starlink_direct");
if(au?.apps?.ios?.length!==40||au?.apps?.android?.length!==39)errors.push({error:"au_app_count",ios:au?.apps?.ios?.length,android:au?.apps?.android?.length});
if(docomo?.apps?.ios?.length!==38||docomo?.apps?.android?.length!==41)errors.push({error:"docomo_app_count",ios:docomo?.apps?.ios?.length,android:docomo?.apps?.android?.length});
if(softbank?.apps?.ios?.length!==22||softbank?.apps?.android?.length!==20)errors.push({error:"softbank_app_count",ios:softbank?.apps?.ios?.length,android:softbank?.apps?.android?.length});
if(matrix.common_rules?.app_data_requires_device_level!=="data_and_message")errors.push({error:"app_data_gate"});
if(softbank?.overseas?.status!=="scheduled"||softbank?.overseas?.start_date!=="2026-09-28")errors.push({error:"softbank_overseas_future_boundary"});
if(docomo?.overseas?.status!=="available"||docomo?.overseas?.start_date!=="2026-09-01")errors.push({error:"docomo_overseas_boundary"});
if(au?.overseas?.status!=="available")errors.push({error:"au_overseas_boundary"});

const records=[...(p167.records||[]),...(p168.records||[]),...(p169.records||[])];
if(records.length!==572)errors.push({error:"runtime_record_count",actual:records.length});
if(new Set(records.map(r=>r.id)).size!==572)errors.push({error:"runtime_record_duplicate"});

const p9a=records.find(r=>r.model_name==="Google Pixel 9a"&&r.original_carrier==="au");
if(!p9a||p9a.runtime_mapping?.au_starlink_direct_level!=="message_only")errors.push({error:"pixel9a_message_only_boundary"});
const s25=records.find(r=>r.model_name==="Galaxy S25"&&r.original_carrier==="SoftBank");
if(!s25||s25.runtime_mapping?.softbank_starlink_direct_level!=="data_and_message")errors.push({error:"galaxy_s25_softbank_data_boundary"});

for(const marker of ["level!=='data_and_message'","message_only","phase170-satellite-app-feature-matrix-v1.json","softbank_starlink_direct","docomo_starlink_direct","au_starlink_direct"]){
  if(!js.includes(marker))errors.push({error:"missing_js_boundary",marker});
}
for(const [lang,html] of [["ja",ja],["en",en]]){
  if((html.match(/data-phase170/g)||[]).length!==1)errors.push({error:"phase170_root_count",lang});
  if((html.match(/phase170-satellite-app-feature\.css/g)||[]).length!==1)errors.push({error:"phase170_css_count",lang});
  if((html.match(/phase170-satellite-app-feature\.js/g)||[]).length!==1)errors.push({error:"phase170_js_count",lang});
  if(!html.includes('data-release="phase170"'))errors.push({error:"phase170_release_marker",lang});
}

const result={
  schema_version:"1.0",
  release:"phase170-satellite-app-feature-matrix",
  checked_at:new Date().toISOString(),
  app_catalog:apps.length,
  au_apps:{ios:au?.apps?.ios?.length||0,android:au?.apps?.android?.length||0},
  docomo_apps:{ios:docomo?.apps?.ios?.length||0,android:docomo?.apps?.android?.length||0},
  softbank_apps:{ios:softbank?.apps?.ios?.length||0,android:softbank?.apps?.android?.length||0},
  runtime_records:records.length,
  pass:errors.length===0,
  errors
};
fs.writeFileSync(path.join(root,"assets","data","phase170-validation-report-v1.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
