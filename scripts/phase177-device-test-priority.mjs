import fs from "node:fs";

const args=process.argv.slice(2);
const arg=n=>{const i=args.indexOf(n);return i>=0?args[i+1]:null};
const pagesPath=arg("--pages");
const dailyPath=arg("--daily");
const costsPath=arg("--costs");
const commercialPath=arg("--commercial");
const outPath=arg("--out")||"assets/data/phase177-device-test-priority-v1.json";
if(!pagesPath||!dailyPath)throw new Error("--pages and --daily are required");

const cfg=JSON.parse(fs.readFileSync("assets/data/phase177-device-test-priority-config-v1.json","utf8"));
const priorityFiles=[
 "assets/data/phase131-priority-enrichment-v1.json","assets/data/phase136-priority-enrichment-v1.json",
 "assets/data/phase137-priority-enrichment-v1.json","assets/data/phase138-priority-enrichment-v1.json",
 "assets/data/phase139-priority-enrichment-v1.json","assets/data/phase140-priority-enrichment-v1.json",
 "assets/data/phase141-priority-enrichment-v1.json","assets/data/phase143-priority-enrichment-v1.json"
].filter(fs.existsSync);
const records=priorityFiles.flatMap(p=>(JSON.parse(fs.readFileSync(p,"utf8")).priority_records||[]).map(r=>({...r,_source:p})));
const real=fs.existsSync("assets/data/phase131-solqvia-real-device-evidence-v1.json")?JSON.parse(fs.readFileSync("assets/data/phase131-solqvia-real-device-evidence-v1.json","utf8")).records||[]:[];

const norm=s=>String(s??"").normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();
const slug=s=>norm(s).replace(/[^a-z0-9ぁ-んァ-ヶ一-龠]+/g,"-").replace(/^-|-$/g,"");
const num=v=>{const n=Number(String(v??"").replace(/,/g,"").replace(/%$/,""));return Number.isFinite(n)?n:null};
function csv(text){const rows=[];let row=[],cell="",q=false;for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')q=false;else cell+=c;}else if(c==='"')q=true;else if(c===','){row.push(cell);cell="";}else if(c==='\n'){row.push(cell.replace(/\r$/,""));if(row.some(x=>x!==""))rows.push(row);row=[];cell="";}else cell+=c;}if(cell||row.length){row.push(cell.replace(/\r$/,""));if(row.some(x=>x!==""))rows.push(row);}const h=(rows.shift()||[]).map(x=>x.replace(/^\uFEFF/,""));return rows.map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]??""])));}
const pages=csv(fs.readFileSync(pagesPath,"utf8")).map(r=>({page:r["上位のページ"]||r["Top pages"]||r.Page||"",clicks:num(r["クリック数"]||r.Clicks)||0,impressions:num(r["表示回数"]||r.Impressions)||0,position:num(r["掲載順位"]||r.Position)})).filter(r=>r.page);
const daily=csv(fs.readFileSync(dailyPath,"utf8")).map(r=>({date:r["日付"]||r.Date,clicks:num(r["クリック数"]||r.Clicks)||0,impressions:num(r["表示回数"]||r.Impressions)||0})).filter(r=>r.date).sort((a,b)=>a.date.localeCompare(b.date));
const sum=xs=>xs.reduce((s,x)=>s+x.impressions,0),last=sum(daily.slice(-28)),prev=sum(daily.slice(-56,-28)),recoveryMode=prev>0&&last/prev<0.5;

function optionalMap(p,kind){if(!p||!fs.existsSync(p))return new Map();const rs=csv(fs.readFileSync(p,"utf8"));const m=new Map();for(const r of rs){const key=norm(r.model_number||r["model_number"])+"|"+norm(r.target_carrier||r["target_carrier"]||"");m.set(key,r);}return m}
const costs=optionalMap(costsPath,"cost"),commercial=optionalMap(commercialPath,"commercial");
const familyCounts={};for(const r of records)familyCounts[norm(r.model_name)]=(familyCounts[norm(r.model_name)]||0)+1;
function demand(r){
 const mn=slug(r.model_number||""), words=slug(r.model_name).split("-").filter(x=>x.length>=2);
 const hits=pages.filter(p=>{const s=slug(p.page);return (mn&&s.includes(mn))||(words.length>=2&&words.every(w=>s.includes(w)))});
 const impressions=hits.reduce((s,x)=>s+x.impressions,0),clicks=hits.reduce((s,x)=>s+x.clicks,0);
 const best=hits.reduce((m,x)=>x.position!=null?Math.min(m,x.position):m,999);
 const max=recoveryMode?cfg.weights.demand_historical_max:cfg.weights.demand_current_max;
 if(!hits.length)return {score:0,confidence:"unmeasured",impressions:0,clicks:0,best_position:null,pages:[]};
 const raw=Math.min(max,Math.log10(impressions+1)/Math.log10(101)*max*0.7 + Math.log10(clicks+1)/Math.log10(11)*max*0.2 + (best<=10?max*0.1:best<=20?max*0.06:0));
 return {score:Math.round(raw*100)/100,confidence:recoveryMode?"historical_3m_during_recovery":"current_export",impressions,clicks,best_position:best===999?null:best,pages:hits.map(x=>x.page)};
}
function ownCount(r,target){const f=new Set();for(const x of real){if(!((r.model_number&&x.model_number&&norm(r.model_number)===norm(x.model_number))||norm(r.model_name)===norm(x.model_name)))continue;for(const [c,tests] of Object.entries(x.tests||{})){if(norm(c)!==norm(target))continue;for(const [k,v] of Object.entries(tests||{}))if(norm(v)==="confirmed")f.add(k);}}return f.size}
function leverage(r){let s=0;const se=r.sim_esim||{},nw=r.network||{};if(se.esim_supported===true)s+=4;if(se.dual_esim===true||se.active_esim_count>=2||/dual|×2|2/i.test(String(se.dual_sim_ui||"")))s+=4;if(nw.fiveg_supported===true)s+=4;if(nw.tethering_supported===true)s+=4;if(nw.volte===true)s+=4;return Math.min(cfg.weights.verification_leverage_max,s)}
function commercialScore(r,target){const row=commercial.get(norm(r.model_number)+"|"+norm(target));if(!row)return 0;const v=num(row.conversion_value_jpy),c=num(row.conversions);if(v==null||c==null)return 0;return Math.min(cfg.weights.verified_commercial_max,Math.log10(v*c+1)/Math.log10(100001)*cfg.weights.verified_commercial_max)}
function costPenalty(r){const row=costs.get(norm(r.model_number)+"|");if(!row)return 0;const c=num(row.estimated_cost_jpy);if(c==null)return 0;return Math.min(cfg.weights.acquisition_cost_penalty_max,Math.log10(c+1)/Math.log10(300001)*cfg.weights.acquisition_cost_penalty_max)}
const carriers=cfg.target_carriers,scenarios=[];
for(const r of records){const d=demand(r);for(const target of carriers){const own=ownCount(r,target);const gap=Math.max(0,cfg.weights.evidence_gap_max-Math.min(cfg.weights.evidence_gap_max,own*2));const reach=Math.min(cfg.weights.family_reach_max,(familyCounts[norm(r.model_name)]||1)*2);const cross=r.original_carrier&&norm(r.original_carrier)!==norm(target)?cfg.weights.cross_carrier_uncertainty_max:2;const total=d.score+gap+leverage(r)+reach+cross+commercialScore(r,target)-costPenalty(r);scenarios.push({model_name:r.model_name,model_number:r.model_number||null,original_carrier:r.original_carrier||null,target_carrier:target,total_score:Math.round(total*100)/100,demand:d,own_confirmed_functions:own,source:r._source});}}
scenarios.sort((a,b)=>b.total_score-a.total_score);
const diversified=[],family={},exact={};for(const s of scenarios){const f=norm(s.model_name),e=norm(s.model_number||s.model_name)+"|"+norm(s.original_carrier);if((family[f]||0)>=cfg.diversification.scenario_queue_family_cap||(exact[e]||0)>=cfg.diversification.scenario_queue_exact_record_cap)continue;diversified.push(s);family[f]=(family[f]||0)+1;exact[e]=(exact[e]||0)+1;if(diversified.length>=30)break;}
const acquisitionMap=new Map();for(const s of diversified){const k=norm(s.model_number||s.model_name)+"|"+norm(s.original_carrier||"");const x=acquisitionMap.get(k)||{model_name:s.model_name,model_number:s.model_number,original_carrier:s.original_carrier,scenario_count:0,best_score:0,target_carriers:[],demand:s.demand};x.scenario_count++;x.best_score=Math.max(x.best_score,s.total_score);if(!x.target_carriers.includes(s.target_carrier))x.target_carriers.push(s.target_carrier);acquisitionMap.set(k,x);}
const acquisition=[...acquisitionMap.values()].sort((a,b)=>b.best_score-a.best_score);
const out={schema_version:"1.0",release:"phase177-device-test-priority-engine",generated_at:new Date().toISOString(),site_recovery_mode:recoveryMode,demand_weight_mode:recoveryMode?"historical_capped":"current",scenario_queue:diversified,first_batch:diversified.slice(0,cfg.diversification.first_batch_scenarios),acquisition_queue:acquisition,rules:cfg.evidence_rules};
fs.writeFileSync(outPath,JSON.stringify(out,null,2)+"\n");
console.log(JSON.stringify({out:outPath,recovery_mode:recoveryMode,scenarios:diversified.length,acquisition:acquisition.length},null,2));
