import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const schema=JSON.parse(fs.readFileSync(process.argv[2]||path.join(root,"assets","data","phase156-esim-rsp-lifecycle-schema-v1.json"),"utf8"));
const db=JSON.parse(fs.readFileSync(process.argv[3]||path.join(root,"assets","data","phase156-esim-rsp-lifecycle-v1.json"),"utf8"));
const failures=JSON.parse(fs.readFileSync(process.argv[4]||path.join(root,"assets","data","phase156-esim-rsp-failure-taxonomy-v1.json"),"utf8"));

const errors=[];
const allowedStates=new Set(schema.states);
const stageOrder=new Map(schema.lifecycle_stages.map(x=>[x.id,x.order]));
const prohibited=new Set(schema.prohibited_secret_fields.map(x=>x.toLowerCase()));

function walk(obj,p=[]){
  if(!obj||typeof obj!=="object")return;
  for(const [k,v] of Object.entries(obj)){
    if(prohibited.has(k.toLowerCase()))errors.push({path:[...p,k].join("."),error:"prohibited_secret_field"});
    if(k==="state"&&!allowedStates.has(v))errors.push({path:[...p,k].join("."),error:"invalid_state",value:v});
    if(v&&typeof v==="object")walk(v,[...p,k]);
  }
}

const orders=schema.lifecycle_stages.map(x=>x.order);
if(new Set(orders).size!==orders.length)errors.push({error:"duplicate_stage_order"});
for(let i=1;i<orders.length;i++)if(orders[i]<=orders[i-1])errors.push({error:"stage_order_not_strictly_increasing"});

for(const rec of db.records||[]){
  if(!rec.key)errors.push({error:"record_missing_key"});
  walk(rec,[rec.key||"unknown"]);
  const stages=rec.workflow?.stages||{};
  for(const id of Object.keys(stages)){
    if(!stageOrder.has(id))errors.push({record:rec.key,error:"unknown_stage",stage:id});
  }
  if(rec.workflow?.activation_method){
    const methods=Array.isArray(rec.workflow.activation_method)?rec.workflow.activation_method:[rec.workflow.activation_method];
    for(const m of methods)if(!schema.activation_methods.includes(m))errors.push({record:rec.key,error:"invalid_activation_method",value:m});
  }
}

for(const f of failures.categories||[]){
  if(!stageOrder.has(f.stage))errors.push({failure:f.id,error:"unknown_failure_stage",stage:f.stage});
}

const serialized=JSON.stringify(db);
const suspicious=[
  /LPA:1\$/i,
  /activation[_ -]?code["']?\s*[:=]\s*["'][^"']+/i,
  /confirmation[_ -]?code["']?\s*[:=]\s*["'][^"']+/i
];
for(const re of suspicious)if(re.test(serialized))errors.push({error:"possible_secret_literal_detected",pattern:String(re)});

const result={
  schema_version:"1.0",
  release:"phase156-esim-rsp-lifecycle-db",
  checked_at:new Date().toISOString(),
  stages:schema.lifecycle_stages.length,
  records:(db.records||[]).length,
  failure_categories:(failures.categories||[]).length,
  pass:errors.length===0,
  errors
};
fs.writeFileSync(path.join(root,"assets","data","phase156-validation-report-v1.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
