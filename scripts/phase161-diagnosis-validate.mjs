import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const schema=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase161-diagnosis-engine-schema-v1.json"),"utf8"));
const questions=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase161-question-catalog-v1.json"),"utf8"));
const rules=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase161-rule-pack-v1.json"),"utf8"));
const localFailures=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase161-engine-failure-taxonomy-v1.json"),"utf8"));
const scenarios=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase161-diagnosis-scenarios-v1.json"),"utf8"));

const sourceFailureDocs=[
  "assets/data/phase156-esim-rsp-failure-taxonomy-v1.json",
  "assets/data/phase157-ims-failure-taxonomy-v1.json",
  "assets/data/phase158-registration-data-failure-taxonomy-v1.json",
  "assets/data/phase160-ca-failure-taxonomy-v1.json"
].map(p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8")));

const errors=[];
const questionIds=new Set();
const observationKeys=new Set(schema.canonical_observations.map(x=>x.key));
const allowedOps=new Set(schema.rule_language.operators);
const ruleIds=new Set();
const failureIds=new Set([
  ...(localFailures.categories||[]).map(x=>x.id),
  ...sourceFailureDocs.flatMap(x=>(x.categories||[]).map(y=>y.id))
]);

for(const q of questions.questions||[]){
  if(questionIds.has(q.id))errors.push({question:q.id,error:"duplicate_question_id"});
  questionIds.add(q.id);
  if(!observationKeys.has(q.observation))errors.push({question:q.id,error:"unknown_observation",observation:q.observation});
}

function checkCondition(c,ruleId,field){
  if(!observationKeys.has(c.observation))errors.push({rule:ruleId,field,error:"unknown_observation",observation:c.observation});
  if(!allowedOps.has(c.op))errors.push({rule:ruleId,field,error:"unknown_operator",op:c.op});
}

for(const r of rules.rules||[]){
  if(ruleIds.has(r.id))errors.push({rule:r.id,error:"duplicate_rule_id"});
  ruleIds.add(r.id);
  for(const goal of r.goals||[])if(!schema.goals.includes(goal))errors.push({rule:r.id,error:"unknown_goal",goal});
  for(const field of ["all_of","any_of","exclude_if","localized_when"]){
    for(const c of r[field]||[])checkCondition(c,r.id,field);
  }
  for(const id of r.next_question_ids||[])if(!questionIds.has(id))errors.push({rule:r.id,error:"unknown_question_id",id});
  for(const id of r.candidate_failure_ids||[])if(!failureIds.has(id))errors.push({rule:r.id,error:"unknown_failure_id",id});
}

for(const s of scenarios.scenarios||[]){
  if(!schema.goals.includes(s.input?.goal))errors.push({scenario:s.id,error:"unknown_goal"});
  for(const key of Object.keys(s.input?.observations||{}))if(!observationKeys.has(key))errors.push({scenario:s.id,error:"unknown_observation",key});
  if(s.expect?.next_question_id && !questionIds.has(s.expect.next_question_id))errors.push({scenario:s.id,error:"unknown_expected_question"});
  for(const id of s.expect?.candidate_includes||[])if(!failureIds.has(id))errors.push({scenario:s.id,error:"unknown_expected_failure",id});
}

const result={
  schema_version:"1.0",
  release:"phase161-failure-diagnosis-engine",
  checked_at:new Date().toISOString(),
  canonical_observations:observationKeys.size,
  questions:questionIds.size,
  rules:ruleIds.size,
  source_failure_ids:failureIds.size,
  scenarios:(scenarios.scenarios||[]).length,
  pass:errors.length===0,
  errors
};

fs.writeFileSync(path.join(root,"assets","data","phase161-validation-report-v1.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
