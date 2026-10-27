import fs from "node:fs";

const targets=[
"ja/technology/smartphone/docomo-apn-settings-android-2026/index.html",
"ja/technology/smartphone/docomo-kids-phone-apn-ymobile-softbank-guide/index.html",
"ja/technology/smartphone/docomo-kids-phone-ymobile-softbank-field-test/index.html",
"ja/technology/smartphone/smartphone-remove-suspicious-app/index.html",
"ja/technology/smartphone/japanet-mobile-service-mnp-reservation-number-guide/index.html",
"ja/technology/smartphone/nihontsushin-sim-mnp-reservation-number-guide/index.html",
"ja/technology/smartphone/daredemo-smartphone-mnp-reservation-number-guide/index.html",
"ja/technology/smartphone/pikara-mobile-mnp-reservation-number-guide/index.html"
];
const errors=[];
const sitemap=fs.readFileSync("sitemap.xml","utf8");
if((sitemap.match(/<loc>/g)||[]).length!==802)errors.push("sitemap must remain 802 URLs");
for(const p of targets){
 const h=fs.readFileSync(p,"utf8");
 if(!h.includes('content="index,follow,max-image-preview:large" name="robots"'))errors.push(p+": indexability changed");
 if((h.match(/id="phase178-answer"/g)||[]).length!==1)errors.push(p+": Phase178 block count");
 if((h.match(/phase178-winner-strengthening\.css/g)||[]).length!==1)errors.push(p+": Phase178 CSS count");
 if(!h.includes('"dateModified":"2026-10-27"'))errors.push(p+": dateModified");
 const canonical=(h.match(/<link href="([^"]+)" rel="canonical"\/>/)||[])[1]||"";
 const expected="https://solqvia.com/"+p.replace(/index\.html$/,"");
 if(canonical!==expected)errors.push(p+": canonical mismatch");
}
const apn=fs.readFileSync(targets[0],"utf8");
for(const x of ["spmode.ne.jp","未設定 または なし","IPv4/IPv6"])if(!apn.includes(x))errors.push("docomo APN missing "+x);
const kids=fs.readFileSync(targets[1],"utf8");
for(const x of ["eSIMプロファイル","SIM情報認識","未検証"])if(!kids.includes(x))errors.push("kids boundary missing "+x);
const suspicious=fs.readFileSync(targets[3],"utf8");
for(const x of ["Google Play Protect","VPNとデバイス管理","盗聴アプリ"])if(!suspicious.includes(x))errors.push("suspicious-app missing "+x);
if(errors.length){console.error(JSON.stringify({pass:false,errors},null,2));process.exit(1);}
console.log(JSON.stringify({pass:true,targets:targets.length,sitemap_urls:802,new_indexable_urls:0},null,2));
