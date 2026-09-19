import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const schema=JSON.parse(fs.readFileSync(process.argv[2]||path.join(root,"assets","data","phase155-carrier-config-settings-schema-v1.json"),"utf8"));
const db=JSON.parse(fs.readFileSync(process.argv[3]||path.join(root,"assets","data","phase155-carrier-config-settings-v1.json"),"utf8"));

const errors=[];
const allowedStates=new Set(schema.states);
const forbidden=/^(imsi|iccid|msisdn|eid|activation_code|confirmation_code|account_id)$/i;

function walk(obj,p=[]){
  if(!obj||typeof obj!=="object")return;
  for(const [k,v] of Object.entries(obj)){
    if(forbidden.test(k))errors.push({path:[...p,k].join("."),error:"forbidden_subscriber_secret_field"});
    if(k==="state"&&!allowedStates.has(v))errors.push({path:[...p,k].join("."),error:"invalid_state",value:v});
    if(v&&typeof v==="object")walk(v,[...p,k]);
  }
}

for(const rec of db.records||[]){
  for(const req of schema.shared_record.required){
    if(rec[req]==null)errors.push({record:rec.key||"unknown",error:"missing_required_field",field:req});
  }
  if(!["android","apple"].includes(rec.platform))errors.push({record:rec.key,error:"invalid_platform"});
  walk(rec,[rec.key||"unknown"]);
  if(rec.platform==="apple"&&rec.configuration?.observed_version&&!rec.evidence?.length){
    errors.push({record:rec.key,error:"apple_observed_version_requires_evidence"});
  }
  if(rec.platform==="android"){
    const fp=rec.configuration?.feature_policies;
    if(fp&&typeof fp==="object"&&fp.carrier_id&&typeof fp.carrier_id==="string"&&/^\d+$/.test(fp.carrier_id)===false&&fp.carrier_id!=="unknown"){
      errors.push({record:rec.key,error:"carrier_id_must_be_numeric_or_unknown"});
    }
  }
}

const result={
  schema_version:"1.0",
  release:"phase155-carrier-config-settings-db",
  checked_at:new Date().toISOString(),
  records:(db.records||[]).length,
  pass:errors.length===0,
  errors
};
fs.writeFileSync(path.join(root,"assets","data","phase155-validation-report-v1.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
