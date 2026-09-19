import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const ja=fs.readFileSync(path.join(root,"ja","technology","smartphone","device-passport","index.html"),"utf8");
const en=fs.readFileSync(path.join(root,"en","technology","smartphone","device-passport","index.html"),"utf8");
const overlay=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase163-device-passport-deep-overlay-v1.json"),"utf8"));

const errors=[];
const count=(s,re)=>(s.match(re)||[]).length;

for(const [lang,html] of [["ja",ja],["en",en]]){
  if(count(html,/phase163-device-passport-deep-ux\.css/g)!==1)errors.push({lang,error:"phase163_css_count"});
  if(count(html,/phase163-device-passport-deep-ux\.js/g)!==1)errors.push({lang,error:"phase163_js_count"});
  if(!html.includes("phase163-three-layer-device-passport-v1"))errors.push({lang,error:"missing_phase163_ux_meta"});
  if(!html.includes("Phase163 · 3-Layer Device Passport"))errors.push({lang,error:"missing_phase163_hero"});
}
if(en.includes("569 device/sales records"))errors.push({error:"stale_en_569_count"});
if(!en.includes("572 device/sales records"))errors.push({error:"missing_en_572_count"});
if(!ja.includes('href="https://solqvia.com/ja/technology/smartphone/device-passport/" rel="canonical"'))errors.push({error:"ja_canonical_changed_or_missing"});
if(!en.includes('href="https://solqvia.com/en/technology/smartphone/device-passport/" rel="canonical"'))errors.push({error:"en_canonical_changed_or_missing"});

if((overlay.records||[]).length!==4)errors.push({error:"unexpected_overlay_record_count",value:(overlay.records||[]).length});
const scg=(overlay.records||[]).find(x=>x.model_number==="SCG36");
const ky=(overlay.records||[]).find(x=>x.model_number==="KY-41C");
const simfree=(overlay.records||[]).find(x=>x.model_number==="SM-S942Q");
if(scg?.data?.mobile_data!=="confirmed")errors.push({error:"scg36_mobile_data_boundary"});
if(scg?.ims?.ims_registration!=="unknown")errors.push({error:"scg36_ims_should_remain_unknown"});
if(scg?.aggregation?.nr_ca!=="not_solqvia_tested")errors.push({error:"scg36_nr_ca_boundary"});
if(ky?.captures?.length!==2)errors.push({error:"ky41c_capture_count"});
if(ky?.next_question?.id!=="q_esim_profile_enabled")errors.push({error:"ky41c_next_question"});
if(ky?.data?.mobile_data!=="not_tested")errors.push({error:"ky41c_data_boundary"});
if(simfree?.aggregation?.nr_ca!=="unknown")errors.push({error:"sms942q_nr_ca_should_remain_unknown"});

const result={
  schema_version:"1.0",
  release:"phase163-device-passport-deep-ux",
  checked_at:new Date().toISOString(),
  overlay_records:(overlay.records||[]).length,
  ky41c_captures:ky?.captures?.length||0,
  pass:errors.length===0,
  errors
};
fs.writeFileSync(path.join(root,"assets","data","phase163-validation-report-v1.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
