import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const schemaPath=process.argv[2]||path.join(root,"assets","data","phase154-connectivity-stack-schema-v1.json");
const samplesPath=process.argv[3]||path.join(root,"assets","data","phase154-connectivity-stack-samples-v1.json");
const schema=JSON.parse(fs.readFileSync(schemaPath,"utf8"));
const samples=JSON.parse(fs.readFileSync(samplesPath,"utf8"));

const states=new Set(schema.enums.observation_state);
const evidenceTypes=new Set(schema.enums.evidence_type);
const confidence=new Set(schema.enums.confidence);
const errors=[];

const forbiddenKeys=new Set(schema.identity_policy.prohibited_personal_identifiers.map(x=>x.toLowerCase()));

function walk(obj,pathParts=[]){
  if(!obj||typeof obj!=="object")return;
  for(const [k,v] of Object.entries(obj)){
    const kp=k.toLowerCase();
    if(forbiddenKeys.has(kp))errors.push({path:[...pathParts,k].join("."),error:"forbidden_personal_identifier"});
    if(k==="state"&&!states.has(v))errors.push({path:[...pathParts,k].join("."),error:"invalid_state",value:v});
    if(k==="evidence"&&Array.isArray(v)){
      for(let i=0;i<v.length;i++){
        const e=v[i]||{};
        for(const req of schema.evidence_object.required){
          if(e[req]==null||e[req]==="")errors.push({path:[...pathParts,k,String(i),req].join("."),error:"missing_evidence_field"});
        }
        if(e.type&&!evidenceTypes.has(e.type))errors.push({path:[...pathParts,k,String(i),"type"].join("."),error:"invalid_evidence_type",value:e.type});
        if(e.confidence&&!confidence.has(e.confidence))errors.push({path:[...pathParts,k,String(i),"confidence"].join("."),error:"invalid_confidence",value:e.confidence});
      }
    }
    if(v&&typeof v==="object")walk(v,[...pathParts,k]);
  }
}

for(const record of samples.records||[]){
  if(!record.key)errors.push({record:"unknown",error:"missing_key"});
  if(record.sample_only!==true)errors.push({record:record.key,error:"sample_only_must_be_true"});
  walk(record,[record.key]);
  const l=record.layers||{};
  const esimState=l.esim_rsp?.profile_enable?.state;
  const regState=l.network_registration?.lte_eps_registration?.state||l.network_registration?.fiveg_sa_registration?.state;
  const dataState=l.data_session?.mobile_data?.state;
  const imsState=l.ims_services?.ims_registration?.state;
  if(esimState==="confirmed"&&(!regState||regState==="unknown")){
    // valid: explicitly allowed, no inference
  }
  if(dataState==="confirmed"&&imsState==="confirmed"){
    // both explicitly recorded; valid
  }
}

const report={
  schema_version:"1.0",
  release:"phase154-connectivity-stack-data-model",
  checked_at:new Date().toISOString(),
  layers:schema.layers.length,
  sample_records:(samples.records||[]).length,
  pass:errors.length===0,
  errors
};
const out=path.join(root,"assets","data","phase154-validation-report-v1.json");
fs.writeFileSync(out,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
if(errors.length)process.exitCode=1;
