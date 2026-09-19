import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const schema=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase162-real-device-capture-schema-v1.json"),"utf8"));
const captures=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase162-real-device-captures-v1.json"),"utf8"));
const phase161=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase161-diagnosis-engine-schema-v1.json"),"utf8"));

const errors=[];
const allowedCaptureLevels=new Set(schema.capture_levels.map(x=>x.id));
const canonical=new Map(phase161.canonical_observations.map(x=>[x.key,x]));
const allowedStateValues=new Set(phase161.observation_state);
const allowedMethods=new Set(schema.observation_record.methods);
const allowedConfidence=new Set(schema.observation_record.confidence);
const evidenceTypes=new Set(schema.evidence_record.types);
const prohibited=new Set(schema.prohibited_field_names.map(x=>x.toLowerCase()));
const ids=new Set();

function walk(obj,p=[]){
  if(!obj||typeof obj!=="object")return;
  for(const [k,v] of Object.entries(obj)){
    if(prohibited.has(k.toLowerCase()))errors.push({path:[...p,k].join("."),error:"prohibited_field_name"});
    if(v&&typeof v==="object")walk(v,[...p,k]);
  }
}

for(const cap of captures.records||[]){
  if(!cap.capture_id){errors.push({error:"missing_capture_id"});continue;}
  if(ids.has(cap.capture_id))errors.push({capture:cap.capture_id,error:"duplicate_capture_id"});
  ids.add(cap.capture_id);
  if(!allowedCaptureLevels.has(cap.capture_level))errors.push({capture:cap.capture_id,error:"invalid_capture_level",value:cap.capture_level});
  if(!phase161.goals.includes(cap.test_goal))errors.push({capture:cap.capture_id,error:"invalid_test_goal",value:cap.test_goal});
  walk(cap,[cap.capture_id]);

  const evidenceIds=new Set((cap.evidence||[]).map(x=>x.id));
  const seenObs=new Map();
  for(const obs of cap.observation_records||[]){
    const meta=canonical.get(obs.key);
    if(!meta){errors.push({capture:cap.capture_id,error:"unknown_observation_key",key:obs.key});continue;}
    if(seenObs.has(obs.key)&&seenObs.get(obs.key)!==obs.value){
      errors.push({capture:cap.capture_id,error:"conflicting_duplicate_observation",key:obs.key});
    }
    seenObs.set(obs.key,obs.value);

    if(meta.kind==="state"&&!allowedStateValues.has(obs.value)){
      errors.push({capture:cap.capture_id,error:"invalid_state_value",key:obs.key,value:obs.value});
    }
    if(!allowedMethods.has(obs.method))errors.push({capture:cap.capture_id,error:"invalid_method",method:obs.method});
    if(!allowedConfidence.has(obs.confidence))errors.push({capture:cap.capture_id,error:"invalid_confidence",confidence:obs.confidence});
    for(const ref of obs.evidence_refs||[])if(!evidenceIds.has(ref))errors.push({capture:cap.capture_id,error:"missing_evidence_ref",ref});
  }

  for(const ev of cap.evidence||[]){
    for(const req of schema.evidence_record.required){
      if(ev[req]==null||ev[req]==="")errors.push({capture:cap.capture_id,evidence:ev.id,error:"missing_evidence_field",field:req});
    }
    if(!evidenceTypes.has(ev.type))errors.push({capture:cap.capture_id,evidence:ev.id,error:"invalid_evidence_type",type:ev.type});
  }

  const p=cap.privacy_review||{};
  if(p.completed!==true)errors.push({capture:cap.capture_id,error:"privacy_review_incomplete"});
  if(p.prohibited_identifiers_present!==false)errors.push({capture:cap.capture_id,error:"privacy_review_failed"});
}

const result={
  schema_version:"1.0",
  release:"phase162-real-device-capture-format",
  checked_at:new Date().toISOString(),
  captures:(captures.records||[]).length,
  canonical_observations:canonical.size,
  pass:errors.length===0,
  errors
};

fs.writeFileSync(path.join(root,"assets","data","phase162-validation-report-v1.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
