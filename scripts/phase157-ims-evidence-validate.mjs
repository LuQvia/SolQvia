import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const schema=JSON.parse(fs.readFileSync(process.argv[2]||path.join(root,"assets","data","phase157-ims-evidence-schema-v1.json"),"utf8"));
const db=JSON.parse(fs.readFileSync(process.argv[3]||path.join(root,"assets","data","phase157-ims-evidence-v1.json"),"utf8"));
const failures=JSON.parse(fs.readFileSync(process.argv[4]||path.join(root,"assets","data","phase157-ims-failure-taxonomy-v1.json"),"utf8"));

const errors=[];
const states=new Set(schema.states);
const roles=new Set(schema.evidence_roles);
const dimensions=new Set(schema.dimensions.map(x=>x.id));

function walkStates(obj,p=[]){
  if(!obj||typeof obj!=="object")return;
  for(const [k,v] of Object.entries(obj)){
    if(k==="state"&&!states.has(v))errors.push({path:[...p,k].join("."),error:"invalid_state",value:v});
    if(v&&typeof v==="object")walkStates(v,[...p,k]);
  }
}

for(const rec of db.records||[]){
  if(!rec.key)errors.push({error:"missing_record_key"});
  walkStates(rec,[rec.key||"unknown"]);
  for(const [dim] of Object.entries(rec.matrix||{})){
    if(!dimensions.has(dim))errors.push({record:rec.key,error:"unknown_dimension",dimension:dim});
  }
  for(const [i,e] of (rec.evidence||[]).entries()){
    for(const req of schema.evidence_contract.required){
      if(e[req]==null||e[req]==="")errors.push({record:rec.key,evidence:i,error:"missing_evidence_field",field:req});
    }
    if(e.role&&!roles.has(e.role))errors.push({record:rec.key,evidence:i,error:"invalid_evidence_role",role:e.role});
  }
  const vr=rec.matrix?.voice_runtime||{};
  const sr=rec.matrix?.sms_runtime||{};
  const ir=rec.matrix?.ims_registration||{};
  if(vr.generic_voice?.state==="confirmed"){
    if(vr.voice_outgoing?.state==="confirmed"||vr.voice_incoming?.state==="confirmed"||vr.volte_call?.state==="confirmed"||vr.vonr_call?.state==="confirmed"){
      errors.push({record:rec.key,error:"generic_voice_must_not_auto_promote_direction_or_bearer"});
    }
  }
  if(sr.generic_sms?.state==="confirmed"){
    if(sr.sms_send?.state==="confirmed"||sr.sms_receive?.state==="confirmed"||sr.sms_over_ims_send?.state==="confirmed"||sr.sms_over_ims_receive?.state==="confirmed"){
      errors.push({record:rec.key,error:"generic_sms_must_not_auto_promote_direction_or_path"});
    }
  }
  if(ir.ims_registration_state?.state==="registered"){
    // registered is valid by itself; runtime service is intentionally independent.
  }
}

for(const f of failures.categories||[]){
  if(!dimensions.has(f.stage))errors.push({failure:f.id,error:"unknown_failure_stage",stage:f.stage});
}

const result={
  schema_version:"1.0",
  release:"phase157-ims-volte-vonr-evidence-matrix",
  checked_at:new Date().toISOString(),
  dimensions:schema.dimensions.length,
  records:(db.records||[]).length,
  failure_categories:(failures.categories||[]).length,
  pass:errors.length===0,
  errors
};
fs.writeFileSync(path.join(root,"assets","data","phase157-validation-report-v1.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
