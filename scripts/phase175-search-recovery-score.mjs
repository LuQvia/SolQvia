import fs from 'node:fs';

const source=JSON.parse(fs.readFileSync('assets/data/phase127-800-page-reexpansion-v1.json','utf8'));
const gscPath=process.argv[2]||'';
function parseCsv(text){
  const rows=[]; let row=[],cell='',q=false;
  for(let i=0;i<text.length;i++){const c=text[i];
    if(c==='"'){if(q&&text[i+1]==='"'){cell+='"';i++;}else q=!q;}
    else if(c===','&&!q){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v!==''))rows.push(row);row=[];cell='';}
    else cell+=c;
  } row.push(cell); if(row.some(v=>v!==''))rows.push(row);
  if(!rows.length)return [];
  const h=rows[0].map(x=>x.replace(/^\uFEFF/,''));
  return rows.slice(1).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]??''])));
}
const live=new Map();
if(gscPath&&fs.existsSync(gscPath)){
  for(const r of parseCsv(fs.readFileSync(gscPath,'utf8'))){
    const url=r.Page||r['ページ']||r.URL||''; if(!url)continue;
    live.set(url,{clicks:+(r.Clicks||r['クリック数']||0),impressions:+(r.Impressions||r['表示回数']||0),position:+(r.Position||r['掲載順位']||999)});
  }
}
function risk(x){
  const g=live.get(x.url)||{clicks:+(x.current_clicks||0),impressions:+(x.current_impressions||0),position:+(x.current_position||999)};
  const sim=Number(x.prior_similarity); let s=0;
  if(g.clicks===0)s+=25;
  if(g.impressions===0)s+=25; else if(g.impressions<=2)s+=18; else if(g.impressions<=5)s+=10;
  if(g.position>50)s+=15; else if(g.position>20)s+=10; else if(g.position>10)s+=5;
  if(Number.isFinite(sim)){if(sim>=.90)s+=25;else if(sim>=.85)s+=18;else if(sim>=.80)s+=12;}
  if(x.category==='carrier')s+=5;
  return {...x,latest_or_fallback:g,search_surface_risk:s};
}
const rows=(source.selected||[]).map(risk).sort((a,b)=>b.search_surface_risk-a.search_surface_risk);
console.log(JSON.stringify({source:gscPath&&fs.existsSync(gscPath)?gscPath:'Phase127 fallback metrics',count:rows.length,rows},null,2));
