import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const schema=JSON.parse(fs.readFileSync(process.argv[2]||path.join(root,"assets","data","phase158-registration-data-schema-v1.json"),"utf8"));
const db=JSON.parse(fs.readFileSync(process.argv[3]||path.join(root,"assets","data","phase158-registration-data-v1.json"),"utf8"));
const failures=JSON.parse(fs.readFileSync(process.argv[4]||path.join(root,"assets","data","phase158-registration-data-failure-taxonomy-v1.json"),"utf8"));

const errors=[];
const states=new Set(schema.states);
const dimensions=new Set(schema.dimensions.map(x=>x.id));
const roles=new Set(schema.evidence_contract.roles);
const prohibited=new Set(schema.prohibited_secret_fields.map(x=>x.toLowerCase()));

function walk(obj,p=[]){
  if(!obj||typeof obj!=="object")return;
  for(const [k,v] of Object.entries(obj)){
    if(prohibited.has(k.toLowerCase()))errors.push({path:[...p,k].join("."),error:"prohibited_secret_field"});
    if(k==="state"&&!states.has(v))errors.push({path:[...p,k].join("."),error:"invalid_state",value:v});
    if(v&&typeof v==="object")walk(v,[...p,k]);
  }
}

for(const rec of db.records||[]){
  if(!rec.key)errors.push({error:"missing_record_key"});
  walk(rec,[rec.key||"unknown"]);
  for(const dim of Object.keys(rec.matrix||{})){
    if(!dimensions.has(dim))errors.push({record:rec.key,error:"unknown_dimension",dimension:dim});
  }
  for(const [i,e] of (rec.evidence||[]).entries()){
    for(const req of schema.evidence_contract.required){
      if(e[req]==null||e[req]==="")errors.push({record:rec.key,evidence:i,error:"missing_evidence_field",field:req});
    }
    if(e.role&&!roles.has(e.role))errors.push({record:rec.key,evidence:i,error:"invalid_evidence_role",role:e.role});
  }

  const run=rec.matrix?.runtime_data||{};
  const apn=rec.matrix?.apn_dnn_profile||{};
  const sess=rec.matrix?.packet_session||{};
  const ip=rec.matrix?.ip_link||{};
  const dns=rec.matrix?.dns_resolution||{};
  const val=rec.matrix?.network_validation||{};

  if(run.state==="confirmed"){
    const autoPromoted=[
      apn.profile_present?.state==="confirmed",
      apn.selected_for_default_data?.state==="selected",
      sess.session_state?.state==="connected",
      ip.ipv4_address_present?.state==="confirmed",
      ip.ipv6_address_present?.state==="confirmed",
      dns.dns_lookup_test?.state==="confirmed",
      val.validated_capability?.state==="validated"
    ];
    const evidenceScope=(rec.evidence||[]).map(e=>String(e.scope||"")).join(" ").toLowerCase();
    if(autoPromoted.some(Boolean) && !/(apn|session|ip|dns|validat)/.test(evidenceScope)){
      errors.push({record:rec.key,error:"runtime_data_must_not_auto_promote_internal_layers"});
    }
  }
}

for(const f of failures.categories||[]){
  if(!dimensions.has(f.stage))errors.push({failure:f.id,error:"unknown_failure_stage",stage:f.stage});
}

const result={
  schema_version:"1.0",
  release:"phase158-registration-data-session-model",
  checked_at:new Date().toISOString(),
  dimensions:schema.dimensions.length,
  records:(db.records||[]).length,
  failure_categories:(failures.categories||[]).length,
  pass:errors.length===0,
  errors
};
fs.writeFileSync(path.join(root,"assets","data","phase158-validation-report-v1.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;