import fs from "node:fs";
import path from "node:path";

const args=process.argv.slice(2);
const arg=n=>{const i=args.indexOf(n);return i>=0?args[i+1]:null};
const pagesPath=arg("--pages");
const queriesPath=arg("--queries");
const dailyPath=arg("--daily");
const outPath=arg("--out")||"assets/data/phase177-gsc-recovery-report-v1.json";
if(!pagesPath||!dailyPath)throw new Error("--pages and --daily are required");

const norm=s=>String(s??"").normalize("NFKC").toLowerCase().trim();
const parseNum=v=>{if(v==null||v==="")return null;const n=Number(String(v).replace(/,/g,"").replace(/%$/,""));return Number.isFinite(n)?n:null};
function parseCsv(text){
  const rows=[];let row=[],cell="",q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(q){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')q=false;else cell+=c;}
    else if(c==='"')q=true;
    else if(c===','){row.push(cell);cell="";}
    else if(c==='\n'){row.push(cell.replace(/\r$/,""));if(row.some(x=>x!==""))rows.push(row);row=[];cell="";}
    else cell+=c;
  }
  if(cell||row.length){row.push(cell.replace(/\r$/,""));if(row.some(x=>x!==""))rows.push(row);}
  const h=(rows.shift()||[]).map(x=>x.replace(/^\uFEFF/,""));
  return rows.map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]??""])));
}
const readCsv=p=>parseCsv(fs.readFileSync(p,"utf8"));
const pages=readCsv(pagesPath).map(r=>({
  page:r["上位のページ"]||r["Top pages"]||r.Page||r.page||"",
  clicks:parseNum(r["クリック数"]||r.Clicks||r.clicks)||0,
  impressions:parseNum(r["表示回数"]||r.Impressions||r.impressions)||0,
  ctr:parseNum(r.CTR||r.ctr),
  position:parseNum(r["掲載順位"]||r.Position||r.position)
})).filter(r=>r.page);
const queries=queriesPath&&fs.existsSync(queriesPath)?readCsv(queriesPath).map(r=>({
  query:r["上位のクエリ"]||r["Top queries"]||r.Query||r.query||"",
  clicks:parseNum(r["クリック数"]||r.Clicks||r.clicks)||0,
  impressions:parseNum(r["表示回数"]||r.Impressions||r.impressions)||0,
  position:parseNum(r["掲載順位"]||r.Position||r.position)
})).filter(r=>r.query):[];
const daily=readCsv(dailyPath).map(r=>({
  date:r["日付"]||r.Date||r.date,
  clicks:parseNum(r["クリック数"]||r.Clicks||r.clicks)||0,
  impressions:parseNum(r["表示回数"]||r.Impressions||r.impressions)||0
})).filter(r=>r.date).sort((a,b)=>a.date.localeCompare(b.date));

const sum=xs=>({clicks:xs.reduce((s,x)=>s+x.clicks,0),impressions:xs.reduce((s,x)=>s+x.impressions,0)});
const last=daily.slice(-28),prev=daily.slice(-56,-28),l=sum(last),p=sum(prev);
const ratio=p.impressions?l.impressions/p.impressions:null;
const recoveryMode=ratio!=null&&ratio<0.5;

function htmlPath(url){
  try{const u=new URL(url);return path.join(process.cwd(),u.pathname.replace(/^\//,""),"index.html");}catch{return null}
}
const pageRows=pages.map(r=>{
  const hp=htmlPath(r.page);
  let robots="unknown";
  if(hp&&fs.existsSync(hp)){
    const h=fs.readFileSync(hp,"utf8");
    const m=h.match(/<meta content="([^"]+)" name="robots"\/>/); robots=m?m[1]:"missing";
  }
  return {...r,robots};
});
const restoreReview=pageRows.filter(r=>r.robots.includes("noindex")&&(r.clicks>0||r.impressions>=8||(r.position!=null&&r.position<=20&&r.impressions>=4)))
 .sort((a,b)=>b.clicks-a.clicks||b.impressions-a.impressions);
const strengthen=pageRows.filter(r=>r.robots.startsWith("index")&&r.impressions>=10&&r.position!=null&&r.position<=20&&(r.clicks/r.impressions)<0.05)
 .sort((a,b)=>b.impressions-a.impressions);
const protect=pageRows.filter(r=>r.clicks>0).sort((a,b)=>b.clicks-a.clicks||b.impressions-a.impressions);

const report={
 schema_version:"1.0",
 release:"phase177-gsc-recovery-audit",
 generated_at:new Date().toISOString(),
 inputs:{pages:pagesPath,queries:queriesPath||null,daily:dailyPath},
 site_health:{
   last_28_days:l,previous_28_days:p,impression_ratio_last28_vs_previous28:ratio,
   recovery_mode:recoveryMode,
   guardrail:recoveryMode?"Freeze additional noindex/index-surface contraction until recovery is measured.":"Normal review mode."
 },
 actions:{
   restore_review:restoreReview.slice(0,100),
   strengthen_indexed:strengthen.slice(0,100),
   protect_click_pages:protect.slice(0,100)
 },
 query_signals:{
   top:queries.sort((a,b)=>b.impressions-a.impressions).slice(0,100)
 },
 rules:[
   "Performance exports do not prove current index coverage by themselves.",
   "Noindex pages with historical demand are review candidates, not automatic restore candidates.",
   "Never infer Query×Page relationships from separate Queries.csv and Pages.csv.",
   "During recovery mode, do not expand noindex batches solely from similarity or low historical clicks."
 ]
};
fs.writeFileSync(outPath,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({out:outPath,recovery_mode:recoveryMode,restore_review:restoreReview.length,strengthen:strengthen.length,protect:protect.length},null,2));
