import fs from 'node:fs';

const errors=[];
const required=[
  'assets/data/phase176-evidence-moat-config-v1.json',
  'assets/phase176-evidence-moat.css',
  'assets/phase176-evidence-moat.js',
  'assets/data/phase176-release-manifest-v1.json',
  'ja/technology/smartphone/device-passport/index.html',
  'en/technology/smartphone/device-passport/index.html',
  'ja/technology/smartphone/real-device-verification-ledger/index.html',
  'en/technology/smartphone/real-device-verification-ledger/index.html'
];
for(const p of required) if(!fs.existsSync(p)) errors.push('missing '+p);

const cfg=JSON.parse(fs.readFileSync('assets/data/phase176-evidence-moat-config-v1.json','utf8'));
if((cfg.functions||[]).length!==12) errors.push('function taxonomy must contain 12 functions');
if(!cfg.functions.some(x=>x.id==='otp')) errors.push('OTP function missing');
if(!cfg.principles.some(x=>x.includes('APN configuration'))) errors.push('APN/eSIM boundary missing');

const pages=required.filter(p=>p.endsWith('index.html'));
for(const p of pages){
  const h=fs.readFileSync(p,'utf8');
  if(!h.includes('/assets/phase176-evidence-moat.css')) errors.push(p+': css not wired');
  if(!h.includes('/assets/phase176-evidence-moat.js')) errors.push(p+': js not wired');
}
for(const p of ['ja/technology/smartphone/device-passport/index.html','en/technology/smartphone/device-passport/index.html']){
  const h=fs.readFileSync(p,'utf8');
  if(!/index,follow/.test(h)) errors.push(p+': indexability unexpectedly changed');
}
const manifest=JSON.parse(fs.readFileSync('assets/data/phase176-release-manifest-v1.json','utf8'));
if(manifest.seo_surface.sitemap_change!==0||manifest.seo_surface.indexability_change!==0) errors.push('SEO surface policy changed');
const ids=new Set((cfg.functions||[]).map(x=>x.id));
for(const term of ['voice_outgoing','voice_incoming','sms_send','sms_receive','otp','volte_ims_registration']) if(!ids.has(term)) errors.push('config missing '+term);

if(errors.length){console.error(JSON.stringify({pass:false,errors},null,2));process.exit(1);}
console.log(JSON.stringify({pass:true,functions:cfg.functions.length,pages:pages.length,seo_surface_change:0},null,2));
