import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const args=process.argv.slice(2);
const seedPath=args[0]||path.join(root,"assets","data","phase145-gsc-demand-seed-v1.json");
const outPath=args[1]||path.join(root,"assets","data","phase145-demand-priority-v1.json");

const readJson=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const norm=s=>String(s??"").normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const round=v=>Math.round(v*100)/100;

function positionOpportunity(position){
  if(position==null||!Number.isFinite(Number(position)))return null;
  const p=Number(position);
  if(p<=3)return 15;
  if(p<=10)return 30;
  if(p<=20)return 24;
  if(p<=40)return 18;
  if(p<=70)return 10;
  return 5;
}

function demandScore(d){
  if(!d||d.impressions==null||!Number.isFinite(Number(d.impressions)))return null;
  const impressions=Math.max(0,Number(d.impressions));
  const impressionScore=clamp(Math.log10(impressions+1)/Math.log10(101)*50,0,50);
  const pos=positionOpportunity(d.position);
  const positionScore=pos==null?10:pos;
  const clickScore=d.clicks==null?0:clamp(Math.log10(Number(d.clicks)+1)/Math.log10(11)*20,0,20);
  const uncertaintyPenalty=(d.impressions_is_lower_bound?3:0)+(d.position_is_approximate?2:0);
  return round(clamp(impressionScore+positionScore+clickScore-uncertaintyPenalty,0,100));
}

function classify(c){
  if(c.url_state==="existing")return "strengthen_existing";
  if(c.url_state==="missing"&&c.distinct_intent===true&&c.evidence_available===true)return "consider_new_url";
  if(c.url_state==="missing")return "research_before_new_url";
  return c.recommended_action||"review";
}

const seed=readJson(seedPath);
const candidates=(seed.candidates||[]).map(c=>{
  const score=demandScore(c.demand);
  return {
    ...c,
    demand_score:score,
    exact_numeric_rank_eligible:score!==null,
    action:classify(c),
    confidence:
      c.demand?.metric_type==="exact_reported_value"?"high":
      c.demand?.metric_type==="reported_lower_bound_and_approx_position"?"medium":
      "low"
  };
});

const numeric=candidates.filter(c=>c.exact_numeric_rank_eligible)
  .sort((a,b)=>b.demand_score-a.demand_score||String(a.id).localeCompare(String(b.id)));
const qualitative=candidates.filter(c=>!c.exact_numeric_rank_eligible);

const output={
  schema_version:"1.0",
  release:"phase145-gsc-demand-priority-engine",
  generated_at:new Date().toISOString(),
  source:seed.source,
  scoring:{
    note:"This seed ranking is only for candidates with safely reusable numerical GSC values. It is replaced by exact raw-export scoring when Query/Page rows are supplied.",
    impression_weight_max:50,
    position_opportunity_weight_max:30,
    click_weight_max:20,
    uncertainty_penalties:{lower_bound_impressions:3,approximate_position:2}
  },
  numeric_priority:numeric.map((c,i)=>({
    rank:i+1,
    id:c.id,
    demand_score:c.demand_score,
    confidence:c.confidence,
    action:c.action,
    current_url:c.current_url||c.current_urls||null,
    query_cluster:c.query_cluster,
    demand:c.demand,
    reason:c.reason
  })),
  qualitative_queue:qualitative.map(c=>({
    id:c.id,
    action:c.action,
    confidence:c.confidence,
    current_url:c.current_url||c.current_urls||null,
    query_cluster:c.query_cluster,
    demand:c.demand,
    reason:c.reason
  })),
  guardrails:seed.rules
};

fs.writeFileSync(outPath,JSON.stringify(output,null,2)+"\n");
console.log(outPath);
