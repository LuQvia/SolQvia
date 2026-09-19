import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const args=process.argv.slice(2);
const getArg=name=>{
  const i=args.indexOf(name);
  return i>=0?args[i+1]:null;
};

const planId=getArg("--plan-id");
const outPath=getArg("--out");
if(!planId){
  console.error("Usage: node scripts/phase164-plan-to-capture-template.mjs --plan-id <id> [--out <json>]");
  process.exit(2);
}

const plans=JSON.parse(fs.readFileSync(path.join(root,"assets","data","phase164-planned-captures-v1.json"),"utf8"));
const plan=(plans.plans||[]).find(x=>x.plan_id===planId);
if(!plan)throw new Error("Plan not found: "+planId);

const target=plan.target||{};
const template={
  schema_version:"1.0",
  source_release:"phase164-real-device-capture-campaign",
  target_release:"phase162-real-device-capture-format",
  planned_only:true,
  plan_id:plan.plan_id,
  warning:"This file is a blank execution template, not completed real-device evidence.",
  capture_id:null,
  capture_version:"1.0",
  capture_level:plan.capture_level==="standard_to_deep"?"standard":plan.capture_level,
  test_goal:plan.test_goal,
  tested_at:null,
  device:{
    model_name:target.model_name??null,
    model_number:target.model_number??null,
    market_region:"JP",
    sales_channel:null,
    original_carrier:null,
    device_family:null
  },
  subscription:{
    carrier:target.carrier==="one carrier per capture"?null:(target.carrier??null),
    brand:null,
    plan_family:null,
    sim_type:target.sim_type??null,
    line_role:"test_line",
    slot_label:null,
    mvno_or_mno:null
  },
  software_snapshot:{
    phase159_snapshot_key:null,
    binding_state:"unbound",
    os_name:null,
    os_version:null,
    build_id:null,
    build_fingerprint:null,
    security_patch:null,
    baseband_full:null,
    baseband_suffix:null,
    modem_firmware:null,
    vendor_ui_name:null,
    vendor_ui_version:null,
    carrier_settings_version:null,
    carrier_config_observed:null
  },
  environment:{
    country_region:"JP",
    location_scope:null,
    indoor_outdoor:null,
    wifi_enabled:null,
    airplane_mode:false,
    dual_sim_active:null,
    network_mode:null,
    roaming:null,
    notes:null
  },
  planned_observation_order:(plan.ordered_observations||[]).map((key,index)=>({
    order:index+1,
    key,
    value:null,
    method:null,
    confidence:null,
    evidence_refs:[]
  })),
  observation_records:[],
  evidence:[],
  privacy_review:{
    completed:false,
    prohibited_identifiers_present:null,
    redaction_required:null,
    review_note:null
  },
  execution_notes:{
    preconditions:plan.preconditions||[],
    optional_deep_methods:plan.optional_deep_methods||[],
    stop_conditions:plan.stop_conditions||[],
    repeat_per_carrier:plan.repeat_per_carrier||[]
  }
};

const output=JSON.stringify(template,null,2)+"\n";
if(outPath){
  const p=path.isAbsolute(outPath)?outPath:path.join(root,outPath);
  fs.writeFileSync(p,output);
}else{
  process.stdout.write(output);
}
