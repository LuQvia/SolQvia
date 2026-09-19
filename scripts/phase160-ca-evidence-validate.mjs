import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const schema=JSON.parse(fs.readFileSync(process.argv[2]||path.join(root,"assets","data","phase160-ca-evidence-schema-v1.json"),"utf8"));
const db=JSON.parse(fs.readFileSync(process.argv[3]||path.join(root,"assets","data","phase160-ca-evidence-v1.json"),"utf8"));
const failures=JSON.parse(fs.readFileSync(process.argv[4]||path.join(root,"assets","data","phase160-ca-failure-taxonomy-v1.json"),"utf8"));

const errors=[];
const levels=new Set(schema.evidence_levels.map(x=>x.id));
const evidenceTypes=new Set(schema.evidence_contract.allowed_types);
const confidence=new Set(schema.evidence_contract.confidence);
const prohibited=new Set(schema.prohibited_fields.map(x=>x.toLowerCase()));
const families=new Set(schema.combination_families);
const dimensions=new Set(schema.dimensions.map(x=>x.id));

function walk(obj,p=[]){
  if(!obj||typeof obj!=="object")return;
  for(const [k,v] of Object.entries(obj)){
    if(prohibited.has(k.toLowerCase()))errors.push({path:[...p,k].join("."),error:"prohibited_identifier_field"});
    if(v&&typeof v==="object")walk(v,[...p,k]);
  }
}

for(const rec of db.records||[]){
  if(!rec.key)errors.push({error:"missing_record_key"});
  walk(rec,[rec.key||"unknown"]);

  if(rec.family && rec.family!=="cross_family" && rec.family!=="runtime_observation" && !families.has(rec.family)){
    errors.push({record:rec.key,error:"invalid_family",value:rec.family});
  }

  for(const combo of rec.combinations||[]){
    if(!levels.has(combo.evidence_level))errors.push({record:rec.key,error:"invalid_combination_evidence_level",value:combo.evidence_level});
    if(combo.evidence_level==="standard_defined" && rec.record_type!=="standards_reference"){
      errors.push({record:rec.key,error:"standard_defined_combo_must_remain_standards_reference"});
    }
  }

  for(const [i,e] of (rec.evidence||[]).entries()){
    for(const req of schema.evidence_contract.required){
      if(e[req]==null||e[req]==="")errors.push({record:rec.key,evidence:i,error:"missing_evidence_field",field:req});
    }
    if(e.type&&!evidenceTypes.has(e.type))errors.push({record:rec.key,evidence:i,error:"invalid_evidence_type",value:e.type});
    if(e.level&&!levels.has(e.level))errors.push({record:rec.key,evidence:i,error:"invalid_evidence_level",value:e.level});
    if(e.confidence&&!confidence.has(e.confidence))errors.push({record:rec.key,evidence:i,error:"invalid_confidence",value:e.confidence});
  }

  const single=rec.single_band_capability;
  const agg=rec.aggregation_capability;
  if(single && agg){
    const lists=[single.lte_fdd,single.lte_tdd,single.nr_fdd,single.nr_tdd].filter(Array.isArray);
    const hasMultipleBands=lists.some(x=>x.length>1);
    if(hasMultipleBands){
      for(const k of ["lte_ca","endc","nr_ca"]){
        if(agg[k]?.state==="confirmed"){
          const scoped=(rec.evidence||[]).some(e=>e.level==="device_capability_official" && /(carrier aggregation|ca combination|endc|en-dc|nr ca|combination)/i.test(String(e.scope||"")));
          if(!scoped)errors.push({record:rec.key,error:"single_band_list_must_not_auto_promote_aggregation",family:k});
        }
      }
    }
  }

  const runtime=rec.runtime;
  if(runtime?.display_hint?.state==="confirmed"){
    const observed=(runtime.observed_component_carriers||[]).length;
    if(observed===0 && (runtime.lte_ca?.state==="confirmed"||runtime.endc?.state==="confirmed"||runtime.nr_ca?.state==="confirmed")){
      errors.push({record:rec.key,error:"display_hint_must_not_prove_exact_runtime_combo"});
    }
  }
}

for(const f of failures.categories||[]){
  if(!dimensions.has(f.stage))errors.push({failure:f.id,error:"unknown_failure_stage",stage:f.stage});
}

const result={
  schema_version:"1.0",
  release:"phase160-ca-endc-nrca-evidence-model",
  checked_at:new Date().toISOString(),
  dimensions:schema.dimensions.length,
  records:(db.records||[]).length,
  failure_categories:(failures.categories||[]).length,
  pass:errors.length===0,
  errors
};
fs.writeFileSync(path.join(root,"assets","data","phase160-validation-report-v1.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;