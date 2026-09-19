import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const priority=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase164-capture-campaign-priority-v1.json"),"utf8"));
const plans=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase164-planned-captures-v1.json"),"utf8"));
const p161=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase161-diagnosis-engine-schema-v1.json"),"utf8"));
const p162=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase162-real-device-captures-v1.json"),"utf8"));

const errors=[];
const canonical=new Set((p161.canonical_observations||[]).map(x=>x.key));
const completedCaptureIds=new Set((p162.records||[]).map(x=>x.capture_id));
const planIds=new Set();
const prohibited=new Set([
  "imei","imei2","meid","eid","iccid","imsi","msisdn","phone_number",
  "activation_code","confirmation_code","account_id","account_password",
  "pin","puk","apn_username","apn_password"
]);

function walk(obj,p=[]){
  if(!obj||typeof obj!=="object")return;
  for(const [k,v] of Object.entries(obj)){
    if(prohibited.has(k.toLowerCase()))errors.push({path:[...p,k].join("."),error:"prohibited_field_name"});
    if(v&&typeof v==="object")walk(v,[...p,k]);
  }
}

for(const plan of plans.plans||[]){
  if(!plan.plan_id){errors.push({error:"missing_plan_id"});continue;}
  if(planIds.has(plan.plan_id))errors.push({plan:plan.plan_id,error:"duplicate_plan_id"});
  planIds.add(plan.plan_id);
  if(completedCaptureIds.has(plan.plan_id))errors.push({plan:plan.plan_id,error:"planned_id_collides_with_completed_capture"});
  if(!p161.goals.includes(plan.test_goal))errors.push({plan:plan.plan_id,error:"invalid_goal",goal:plan.test_goal});
  for(const key of plan.ordered_observations||[]){
    if(!canonical.has(key))errors.push({plan:plan.plan_id,error:"unknown_observation_key",key});
  }
  walk(plan,[plan.plan_id]);
}

const priorityCampaignIds=[];
for(const track of priority.tracks||[]){
  for(const campaign of track.campaigns||[])priorityCampaignIds.push(campaign.campaign_id);
}
for(const id of priorityCampaignIds){
  if(!planIds.has(id))errors.push({campaign:id,error:"priority_campaign_without_plan"});
}
for(const id of planIds){
  if(!priorityCampaignIds.includes(id))errors.push({plan:id,error:"plan_without_priority_campaign"});
}

if(priority.data_state?.fresh_raw_gsc_available!==false){
  errors.push({error:"phase164_must_not_claim_fresh_gsc_without_raw_input"});
}
if(priority.data_state?.direct_device_query_demand_available!==false){
  errors.push({error:"device_specific_gsc_demand_must_remain_unavailable"});
}

const result={
  schema_version:"1.0",
  release:"phase164-real-device-capture-campaign",
  checked_at:new Date().toISOString(),
  planned_campaigns:planIds.size,
  completed_phase162_captures:completedCaptureIds.size,
  canonical_observations:canonical.size,
  pass:errors.length===0,
  errors
};

fs.writeFileSync(path.join(root,"assets","data","phase164-validation-report-v1.json"),JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
