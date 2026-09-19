import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const exists=p=>fs.existsSync(path.join(root,p));
const extract=(re,s)=>s.match(re)?.[1]??null;

const expectedRelease="phase152-cross-surface-consistency-audit-2026-09-19";
const passportSurfaces=[
  "ja/index.html",
  "en/index.html",
  "ja/technology/smartphone/device-compatibility/index.html",
  "en/technology/smartphone/device-compatibility/index.html",
  "ja/technology/smartphone/device-passport/index.html",
  "en/technology/smartphone/device-passport/index.html"
];
const strengthened=[
  "ja/technology/smartphone/android-always-on-vpn-blocks-internet-when-vpn-disconnected/index.html",
  "en/technology/smartphone/android-always-on-vpn-blocks-internet-when-vpn-disconnected/index.html",
  "ja/technology/smartphone/au-esim-after-activation-mms-au-mail-not-working/index.html",
  "en/technology/smartphone/au-esim-after-activation-mms-au-mail-not-working/index.html",
  "ja/technology/smartphone/company-owned-smartphone-reset-mdm-frp-activation-lock/index.html",
  "ja/technology/smartphone/smartphone-remove-suspicious-app/index.html",
  "en/technology/smartphone/smartphone-remove-suspicious-app/index.html",
  "ja/technology/smartphone/google-lens-image-search/index.html",
  "en/technology/smartphone/google-lens-image-search/index.html",
  "ja/technology/smartphone/smartphone-touchscreen-not-responding/index.html",
  "ja/technology/smartphone/smartphone-screen-flickering-lines/index.html",
  "ja/technology/smartphone/smartphone-no-sound/index.html",
  "ja/technology/smartphone/smartphone-not-charging/index.html",
  "en/technology/smartphone/smartphone-touchscreen-not-responding/index.html",
  "en/technology/smartphone/smartphone-screen-flickering-lines/index.html",
  "en/technology/smartphone/smartphone-no-sound/index.html",
  "en/technology/smartphone/smartphone-not-charging/index.html"
];

const results=[];
let failed=false;
for(const file of [...passportSurfaces,...strengthened]){
  if(!exists(file)){results.push({file,error:"missing"});failed=true;continue;}
  const html=read(file);
  const title=extract(/<title>(.*?)<\/title>/s,html);
  const description=extract(/<meta content="([^"]*)" name="description"\/>/,html);
  const robots=extract(/<meta content="([^"]*)" name="robots"\/>/,html);
  const release=extract(/<meta content="([^"]*)" name="solqvia-release"\/>/,html);
  const canonicals=(html.match(/rel="canonical"/g)||[]).length;
  const links=[...html.matchAll(/href="(\/(?:ja|en)\/technology\/smartphone\/[^"#?]+\/?)/g)].map(m=>m[1]);
  const row={file,title_length:title?.length??0,description_length:description?.length??0,robots,release,canonical_count:canonicals,internal_smartphone_links:new Set(links).size};
  if(canonicals!==1){row.error="canonical_count";failed=true;}
  results.push(row);
}
for(const file of passportSurfaces){
  const html=read(file);
  if(!html.includes(expectedRelease)){failed=true;results.push({file,error:"phase152_release_marker_missing"});}
}
const jaPassport=read("ja/technology/smartphone/device-passport/index.html");
const enPassport=read("en/technology/smartphone/device-passport/index.html");
if(!jaPassport.includes('id="p110Count">572件')){failed=true;results.push({file:"ja/technology/smartphone/device-passport/index.html",error:"expected_572_count"});}
if(!enPassport.includes('id="p110Count">572 records')){failed=true;results.push({file:"en/technology/smartphone/device-passport/index.html",error:"expected_572_count"});}
if(enPassport.includes("Phase141 normalizes six Japanese Galaxy A57")){failed=true;results.push({file:"en/technology/smartphone/device-passport/index.html",error:"stale_phase141_hero"});}

const sitemap=read("sitemap.xml");
const sitemapCount=(sitemap.match(/<loc>/g)||[]).length;
if(sitemapCount!==802){failed=true;results.push({file:"sitemap.xml",error:"url_count",actual:sitemapCount,expected:802});}

const report={
  schema_version:"1.0",
  release:"phase152-cross-surface-consistency-audit",
  generated_at:new Date().toISOString(),
  pass:!failed,
  sitemap_url_count:sitemapCount,
  pages:results
};
const out=path.join(root,"assets","data","phase152-runtime-audit-v1.json");
fs.writeFileSync(out,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({pass:!failed,sitemap_url_count:sitemapCount,audited_pages:results.length,output:out},null,2));
if(failed)process.exitCode=1;
