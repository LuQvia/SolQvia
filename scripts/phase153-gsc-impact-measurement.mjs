import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const args=process.argv.slice(2);
const getArg=name=>{
  const i=args.indexOf(name);
  return i>=0?args[i+1]:null;
};
const queriesPath=getArg("--queries");
const pagesPath=getArg("--pages");
const queryPagesPath=getArg("--query-pages");
const outPath=getArg("--out")||path.join(root,"assets","data","phase153-gsc-impact-report-v1.json");
const targetsPath=getArg("--targets")||path.join(root,"assets","data","phase153-gsc-impact-targets-v1.json");

const targets=JSON.parse(fs.readFileSync(targetsPath,"utf8"));
const norm=s=>String(s??"").normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();
const parseNum=v=>{
  if(v==null||v==="")return null;
  const n=Number(String(v).replace(/,/g,""));
  return Number.isFinite(n)?n:null;
};
const parseCtr=v=>{
  if(v==null||v==="")return null;
  const s=String(v).trim();
  if(s.endsWith("%")){
    const n=Number(s.slice(0,-1).replace(/,/g,""));
    return Number.isFinite(n)?n:null;
  }
  const n=Number(s.replace(/,/g,""));
  if(!Number.isFinite(n))return null;
  return n<=1?n*100:n;
};

function parseCsv(text){
  const rows=[];
  let row=[],field="",quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){
      if(ch==='"'&&text[i+1]==='"'){field+='"';i++;}
      else if(ch==='"')quoted=false;
      else field+=ch;
    }else{
      if(ch==='"')quoted=true;
      else if(ch===","){row.push(field);field="";}
      else if(ch==="\n"){row.push(field.replace(/\r$/,""));rows.push(row);row=[];field="";}
      else field+=ch;
    }
  }
  if(field.length||row.length){row.push(field.replace(/\r$/,""));rows.push(row);}
  if(!rows.length)return [];
  const headers=rows.shift().map(h=>norm(h).replace(/^\ufeff/,""));
  return rows.filter(r=>r.some(x=>String(x).trim()!=="")).map(r=>{
    const o={};
    headers.forEach((h,i)=>o[h]=r[i]??"");
    return o;
  });
}

const aliases={
  query:["top queries","query","queries","検索クエリ","上位のクエリ","クエリ"],
  page:["top pages","page","pages","ページ","上位のページ","url"],
  clicks:["clicks","クリック数","クリック"],
  impressions:["impressions","表示回数","インプレッション"],
  ctr:["ctr","平均ctr","クリック率"],
  position:["position","average position","掲載順位","平均掲載順位"]
};
const field=(row,key)=>{
  for(const a of aliases[key])if(Object.prototype.hasOwnProperty.call(row,norm(a)))return row[norm(a)];
  return null;
};
const canonicalRow=(row,type)=>({
  query:type!=="page"?String(field(row,"query")??"").trim():"",
  page:type!=="query"?String(field(row,"page")??"").trim():"",
  clicks:parseNum(field(row,"clicks")),
  impressions:parseNum(field(row,"impressions")),
  ctr:parseCtr(field(row,"ctr")),
  position:parseNum(field(row,"position"))
});

function loadCsv(p,type){
  if(!p)return [];
  const abs=path.isAbsolute(p)?p:path.join(root,p);
  if(!fs.existsSync(abs))throw new Error("Input not found: "+abs);
  return parseCsv(fs.readFileSync(abs,"utf8")).map(r=>canonicalRow(r,type));
}

const queryRows=loadCsv(queriesPath,"query");
const pageRows=loadCsv(pagesPath,"page");
const queryPageRows=loadCsv(queryPagesPath,"query-page");

const urlify=p=>{
  if(!p)return "";
  try{
    const u=new URL(p);
    return u.pathname.endsWith("/")?u.pathname:u.pathname+"/";
  }catch{
    const s=p.startsWith("/")?p:"/"+p;
    return s.endsWith("/")?s:s+"/";
  }
};
const includesPattern=(q,patterns)=>{
  const nq=norm(q);
  return patterns.some(p=>{
    const np=norm(p);
    return nq.includes(np)||np.includes(nq);
  });
};
const avgPosition=rows=>{
  const valid=rows.filter(r=>r.position!=null&&r.impressions!=null&&r.impressions>0);
  if(!valid.length)return null;
  const imp=valid.reduce((s,r)=>s+r.impressions,0);
  return imp?valid.reduce((s,r)=>s+r.position*r.impressions,0)/imp:null;
};
const aggregate=rows=>{
  if(!rows.length)return null;
  const clicks=rows.reduce((s,r)=>s+(r.clicks??0),0);
  const impressions=rows.reduce((s,r)=>s+(r.impressions??0),0);
  return {
    clicks,
    impressions,
    ctr_percent:impressions?clicks/impressions*100:null,
    position:avgPosition(rows),
    row_count:rows.length
  };
};
const round=v=>v==null?null:Math.round(v*100)/100;
const cleanMetric=m=>m?Object.fromEntries(Object.entries(m).map(([k,v])=>[k,typeof v==="number"?round(v):v])):null;

function baselineDelta(b,current){
  if(!b||!current)return null;
  const d={};
  if(b.impressions!=null)d.impressions_delta=current.impressions-b.impressions;
  if(b.clicks!=null)d.clicks_delta=current.clicks-b.clicks;
  if(b.ctr!=null)d.ctr_percentage_point_delta=current.ctr_percent-b.ctr;
  if(b.position!=null)d.position_delta=current.position-b.position;
  if(b.impressions_lower_bound!=null){
    d.impressions_vs_lower_bound=current.impressions-b.impressions_lower_bound;
    d.note="Baseline impressions are a lower bound; this is not an exact before/after delta.";
  }
  if(b.position_approx_min!=null&&b.position_approx_max!=null){
    d.position_vs_approx_range={
      current:round(current.position),
      baseline_min:b.position_approx_min,
      baseline_max:b.position_approx_max
    };
  }
  return Object.keys(d).length?d:null;
}

const results=targets.targets.map(t=>{
  const pathSet=new Set(t.pages.map(urlify));
  const qRows=queryRows.filter(r=>includesPattern(r.query,t.query_patterns));
  const pRows=pageRows.filter(r=>pathSet.has(urlify(r.page)));
  const qpRows=queryPageRows.filter(r=>pathSet.has(urlify(r.page))&&includesPattern(r.query,t.query_patterns));
  const queryMetric=cleanMetric(aggregate(qRows));
  const pageMetric=cleanMetric(aggregate(pRows));
  const exactMetric=cleanMetric(aggregate(qpRows));
  const comparableBaseline=(t.baseline?.scope==="query"||t.baseline?.scope==="query_cluster")?queryMetric:null;
  return {
    id:t.id,
    phase:t.phase,
    strengthened_at:t.strengthened_at,
    index_state:t.index_state,
    pages:t.pages,
    query_patterns:t.query_patterns,
    baseline:t.baseline,
    current:{
      exact_query_page:exactMetric,
      query_cluster:queryMetric,
      page:pageMetric
    },
    baseline_comparison:baselineDelta(t.baseline,comparableBaseline),
    measurement_confidence:exactMetric?"exact_query_page":(queryMetric&&pageMetric?"split_export_no_inferred_join":(queryMetric||pageMetric?"partial":"unmeasured"))
  };
});

const report={
  schema_version:"1.0",
  release:"phase153-gsc-impact-measurement",
  generated_at:new Date().toISOString(),
  inputs:{
    queries:queriesPath||null,
    pages:pagesPath||null,
    query_pages:queryPagesPath||null
  },
  rules:{
    exact_query_page_preferred:true,
    inferred_query_page_join:false,
    position_aggregation:"impression-weighted average when impressions are available",
    ctr:"recomputed from total clicks / total impressions"
  },
  summary:{
    targets:results.length,
    exact_query_page_targets:results.filter(x=>x.measurement_confidence==="exact_query_page").length,
    split_export_targets:results.filter(x=>x.measurement_confidence==="split_export_no_inferred_join").length,
    partial_targets:results.filter(x=>x.measurement_confidence==="partial").length,
    unmeasured_targets:results.filter(x=>x.measurement_confidence==="unmeasured").length
  },
  targets:results
};

fs.writeFileSync(outPath,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({output:outPath,summary:report.summary},null,2));
