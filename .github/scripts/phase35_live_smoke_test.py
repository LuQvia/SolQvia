from __future__ import annotations
import argparse, json, re, sys, urllib.request, urllib.error
import xml.etree.ElementTree as ET

p=argparse.ArgumentParser(); p.add_argument('--domain',default='https://solqvia.com'); p.add_argument('--require-review-code',action='store_true'); p.add_argument('--require-ads-txt',action='store_true'); a=p.parse_args()
base=a.domain.rstrip('/'); errors=[]; checks=[]
def fetch(path, expect=200):
    url=base+path; req=urllib.request.Request(url,headers={'User-Agent':'SolQvia-Phase35-LiveCheck/1.0'})
    try:
        with urllib.request.urlopen(req,timeout=20) as r: data=r.read(); status=r.status; ctype=r.headers.get('content-type','')
    except Exception as e: errors.append(f'{url}: {e}'); return b'',0,''
    checks.append({'url':url,'status':status,'content_type':ctype,'bytes':len(data)})
    if status!=expect: errors.append(f'{url}: expected {expect}, got {status}')
    return data,status,ctype
home,_,_=fetch('/')
robots,_,_=fetch('/robots.txt')
sitemap,_,_=fetch('/sitemap.xml')
manifest,_,_=fetch('/release-manifest.json')
fetch('/.well-known/security.txt')
if b'Sitemap:' not in robots: errors.append('robots.txt has no Sitemap line')
if b'Mediapartners-Google' not in robots: errors.append('robots.txt has no Mediapartners-Google rule')
try:
    m=json.loads(manifest.decode('utf-8')); expected=int(m.get('sitemap_urls',0)); samples=m.get('sample_urls',[])[:10]
except Exception as e: errors.append(f'release-manifest.json invalid: {e}'); expected=0; samples=[]
try:
    root=ET.fromstring(sitemap); actual=len(root.findall('{http://www.sitemaps.org/schemas/sitemap/0.9}url'))
    if expected and actual!=expected: errors.append(f'Sitemap count mismatch: manifest {expected}, live {actual}')
except Exception as e: errors.append(f'sitemap.xml invalid: {e}')
for url in samples:
    path='/' + url.split('/',3)[-1] if url.startswith('http') else url
    body,status,_=fetch(path)
    if status==200 and b'<link rel="canonical"' not in body and b'rel="canonical"' not in body: errors.append(f'Missing canonical in {path}')
if a.require_review_code and b'pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-' not in home: errors.append('AdSense review code not found on homepage')
if a.require_ads_txt:
    ads,status,_=fetch('/ads.txt')
    if status==200 and not re.search(rb'^google\.com, pub-\d{16}, DIRECT, f08c47fec0942fa0\s*$',ads.strip()): errors.append('ads.txt format invalid')
print(json.dumps({'domain':base,'checks':checks,'errors':errors,'error_count':len(errors),'pass':not errors},ensure_ascii=False,indent=2))
sys.exit(1 if errors else 0)
