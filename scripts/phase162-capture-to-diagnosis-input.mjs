import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const args=process.argv.slice(2);
const getArg=name=>{
  const i=args.indexOf(name);
  return i>=0?args[i+1]:null;
};
const inputPath=getArg("--input");
const captureId=getArg("--capture-id");
const outPath=getArg("--out");

if(!inputPath){
  console.error("Usage: node scripts/phase162-capture-to-diagnosis-input.mjs --input <json> [--capture-id <id>] [--out <json>]");
  process.exit(2);
}

const abs=path.isAbsolute(inputPath)?inputPath:path.join(root,inputPath);
const doc=JSON.parse(fs.readFileSync(abs,"utf8"));
const records=Array.isArray(doc.records)?doc.records:[doc];
let capture=null;

if(captureId){
  capture=records.find(x=>x.capture_id===captureId);
  if(!capture)throw new Error("Capture not found: "+captureId);
}else if(records.length===1){
  capture=records[0];
}else{
  throw new Error("Input contains multiple captures; --capture-id is required.");
}

const privacy=capture.privacy_review||{};
if(privacy.completed!==true||privacy.prohibited_identifiers_present!==false){
  throw new Error("Privacy review has not passed.");
}

const observations={};
for(const rec of capture.observation_records||[]){
  if(rec.key==null||rec.value==null)continue;
  if(Object.prototype.hasOwnProperty.call(observations,rec.key)&&observations[rec.key]!==rec.value){
    throw new Error("Conflicting duplicate observation: "+rec.key);
  }
  observations[rec.key]=rec.value;
}

const output={
  schema_version:"1.0",
  source_release:"phase162-real-device-capture-format",
  target_release:"phase161-failure-diagnosis-engine",
  goal:capture.test_goal,
  observations,
  provenance:{
    capture_id:capture.capture_id,
    tested_at:capture.tested_at,
    model_name:capture.device?.model_name??null,
    model_number:capture.device?.model_number??null,
    carrier:capture.subscription?.carrier??null,
    sim_type:capture.subscription?.sim_type??null,
    software_snapshot_key:capture.software_snapshot?.phase159_snapshot_key??null,
    software_snapshot_binding:capture.software_snapshot?.binding_state??null
  }
};

const text=JSON.stringify(output,null,2)+"\n";
if(outPath){
  const outAbs=path.isAbsolute(outPath)?outPath:path.join(root,outPath);
  fs.writeFileSync(outAbs,text);
}else{
  process.stdout.write(text);
}
