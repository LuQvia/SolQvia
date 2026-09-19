import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const schema=JSON.parse(fs.readFileSync(process.argv[2]||path.join(root,"assets","data","phase159-software-snapshot-schema-v1.json"),"utf8"));
const db=JSON.parse(fs.readFileSync(process.argv[3]||path.join(root,"assets","data","phase159-software-snapshots-v1.json"),"utf8"));
const comparison=JSON.parse(fs.readFileSync(process.argv[4]||path.join(root,"assets","data","phase159-snapshot-comparison-rules-v1.json"),"utf8"));

const errors=[];
const snapshotTypes=new Set(schema.snapshot_types);
const bindingStates=new Set(schema.dimensions.find(x=>x.id==="runtime_binding").allowed_binding_state);
const evidenceTypes=new Set(schema.evidence_contract.allowed_types);
const evidenceRoles=new Set(schema.evidence_contract.roles);
const confidence=new Set(schema.evidence_contract.confidence);
const prohibited=new Set(schema.prohibited_fields.map(x=>x.toLowerCase()));
const keys=new Set();

function walk(obj,p=[]){
  if(!obj||typeof obj!=="object")return;
  for(const [k,v] of Object.entries(obj)){
    if(prohibited.has(k.toLowerCase()))errors.push({path:[...p,k].join("."),error:"prohibited_identifier_field"});
    if(v&&typeof v==="object")walk(v,[...p,k]);
  }
}

for(const rec of db.records||[]){
  if(!rec.key){errors.push({error:"missing_record_key"});continue;}
  if(keys.has(rec.key))errors.push({record:rec.key,error:"duplicate_record_key"});
  keys.add(rec.key);
  if(!snapshotTypes.has(rec.snapshot_type))errors.push({record:rec.key,error:"invalid_snapshot_type",value:rec.snapshot_type});
  walk(rec,[rec.key]);

  const binding=rec.runtime_binding||{};
  if(!bindingStates.has(binding.binding_state))errors.push({record:rec.key,error:"invalid_binding_state",value:binding.binding_state});
  if(rec.snapshot_type==="official_latest_reference"&&binding.binding_state==="exact_snapshot"){
    errors.push({record:rec.key,error:"official_latest_reference_cannot_be_exact_runtime_binding"});
  }

  const rf=rec.snapshot?.radio_firmware||{};
  if(rf.baseband_suffix&&rf.baseband_full){
    // Both may coexist only when the source explicitly supplies both. Require evidence scope mentioning full/baseband.
    const scope=(rec.evidence||[]).map(e=>String(e.scope||"")).join(" ").toLowerCase();
    if(!/full baseband|baseband version/.test(scope))errors.push({record:rec.key,error:"baseband_suffix_plus_full_requires_explicit_evidence"});
  }
  if(rf.baseband_suffix&&!rf.radio_observation_method){
    errors.push({record:rec.key,error:"baseband_suffix_requires_observation_method"});
  }

  for(const [i,e] of (rec.evidence||[]).entries()){
    for(const req of schema.evidence_contract.required){
      if(e[req]==null||e[req]==="")errors.push({record:rec.key,evidence:i,error:"missing_evidence_field",field:req});
    }
    if(e.type&&!evidenceTypes.has(e.type))errors.push({record:rec.key,evidence:i,error:"invalid_evidence_type",value:e.type});
    if(e.role&&!evidenceRoles.has(e.role))errors.push({record:rec.key,evidence:i,error:"invalid_evidence_role",value:e.role});
    if(e.confidence&&!confidence.has(e.confidence))errors.push({record:rec.key,evidence:i,error:"invalid_confidence",value:e.confidence});
  }
}

const comparisonIds=new Set((comparison.comparison_levels||[]).map(x=>x.id));
for(const id of ["exact","partial","same_os_only","same_model_only","not_comparable"]){
  if(!comparisonIds.has(id))errors.push({error:"missing_comparison_level",id});
}

const result={
  schema_version:"1.0",
  release:"phase159-versioned-software-snapshot-model",
  checked_at:new Date().toISOString(),
  records:(db.records||[]).length,
  comparison_levels:(comparison.comparison_levels||[]).length,
  pass:errors.length===0,
  errors
};
fs.writeFileSync(path.join(root,"assets","data","phase159-validation-report-v1.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;