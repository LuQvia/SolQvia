import fs from 'node:fs';

const manifest=JSON.parse(fs.readFileSync('assets/data/phase175-release-manifest-v1.json','utf8'));
const sitemap=fs.readFileSync('sitemap.xml','utf8');
const errors=[];
const locCount=(sitemap.match(/<loc>/g)||[]).length;
if(locCount!==manifest.sitemap.after)errors.push('sitemap count '+locCount);
const changed=process.argv.slice(2);
for(const p of changed){
  const h=fs.readFileSync(p,'utf8');
  if(!h.includes('content="noindex,follow" name="robots"'))errors.push(p+': robots');
  if(!h.includes('data-index-status="noindex"'))errors.push(p+': index marker');
  if(!h.includes('data-ad-eligible="false"'))errors.push(p+': ad eligible');
}
if(errors.length){console.error(JSON.stringify({pass:false,errors},null,2));process.exit(1);}
console.log(JSON.stringify({pass:true,sitemap_urls:locCount,batch1:manifest.batch1.candidate_count},null,2));
