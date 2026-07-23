from __future__ import annotations
import hashlib, json, re, sys
from pathlib import Path
from urllib.parse import urlparse
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup

root=Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve(); errors=[]
htmls=list(root.rglob('*.html')); indexable=[]
for p in htmls:
    try: soup=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser')
    except Exception as e: errors.append(f'HTML read: {p}: {e}'); continue
    rob=soup.find('meta',attrs={'name':'robots'}); is_index=bool(rob and 'noindex' not in (rob.get('content') or '').lower())
    if is_index: indexable.append(p)
    for s in soup.find_all('script',attrs={'type':'application/ld+json'}):
        try: json.loads(s.string or s.get_text())
        except Exception as e: errors.append(f'JSON-LD: {p.relative_to(root)}: {e}')
    for a in soup.select('a[href]'):
        href=a.get('href','')
        if not href.startswith('/') or href.startswith('//'): continue
        path=urlparse(href).path; target=root/path.lstrip('/')
        if path.endswith('/'): target=target/'index.html'
        if not target.exists(): errors.append(f'Broken link: {p.relative_to(root)} -> {href}')
    if is_index:
        if not soup.find('meta',attrs={'name':'solqvia-release'}): errors.append(f'Missing release meta: {p.relative_to(root)}')
        if soup.body and soup.body.get('data-release')!='phase34': errors.append(f'Missing release body marker: {p.relative_to(root)}')
        if not soup.find('link',attrs={'rel':'canonical'}): errors.append(f'Missing canonical: {p.relative_to(root)}')
        if not soup.find('meta',attrs={'property':'og:image'}): errors.append(f'Missing og:image: {p.relative_to(root)}')
        if not soup.find('script',src='/assets/platform-loader.js'): errors.append(f'Missing platform loader: {p.relative_to(root)}')

sitemap=root/'sitemap.xml'
if not sitemap.exists(): errors.append('Missing sitemap.xml'); sitemap_urls=[]
else:
    ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
    sitemap_urls=[n.text for n in ET.parse(sitemap).getroot().findall('.//s:loc',ns)]
if len(sitemap_urls)!=len(indexable): errors.append(f'Sitemap/indexable mismatch: {len(sitemap_urls)} vs {len(indexable)}')
for required in ['robots.txt','release-manifest.json','phase34-status.json','site.webmanifest','.well-known/security.txt']:
    if not (root/required).exists(): errors.append(f'Missing required file: {required}')
robots=(root/'robots.txt').read_text(encoding='utf-8') if (root/'robots.txt').exists() else ''
if 'Mediapartners-Google' not in robots: errors.append('robots.txt lacks Mediapartners-Google rule')
config=(root/'assets/platform-config.js').read_text(encoding='utf-8') if (root/'assets/platform-config.js').exists() else ''
if 'ca-pub-XXXXXXXXXXXXXXXX' in config or 'pub-0000000000000000' in config: errors.append('Placeholder AdSense ID found')
review=bool(re.search(r'adsenseSiteReviewEnabled:\s*true',config)); client=re.search(r'adsenseClient:\s*["\'](ca-pub-\d{16})["\']',config)
if review and not client: errors.append('AdSense review enabled without valid client')
for p in indexable:
    soup=BeautifulSoup(p.read_text(encoding='utf-8'),'html.parser')
    direct=soup.find('script',attrs={'data-solqvia-adsense':'review'})
    if review and not direct: errors.append(f'Missing review code: {p.relative_to(root)}')
    if not review and direct: errors.append(f'Unexpected review code: {p.relative_to(root)}')
print(json.dumps({'phase':'34','html_files':len(htmls),'indexable':len(indexable),'sitemap_urls':len(sitemap_urls),'errors':errors[:100],'error_count':len(errors),'pass':not errors},ensure_ascii=False,indent=2))
sys.exit(1 if errors else 0)
