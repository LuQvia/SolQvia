#!/usr/bin/env python3
from pathlib import Path
import base64, hashlib, io, json, lzma, shutil, tarfile, tempfile

ROOT = Path.cwd()
PAYLOAD_B64 = Path('/tmp/phase129_payload.b64')
EXPECTED_COUNT = 2167
EXPECTED_DIGEST = '6d67dd94d897a2019c9a4172b731ca7ce355d0f7deb0c6ca8b5e1d0439da8af1'
OLD_RELEASE = 'phase94-model-region-variant-2026-08-08'
NEW_RELEASE = 'phase128-market-aligned-content-2026-09-17'

def die(msg):
    raise SystemExit(msg)

def read_text(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

def write_text(rel, s):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(s, encoding='utf-8')

for rel, sha in {
    'ja/index.html':'54d3fe36a7a2ca7fbdf35fa0120e894e0ecb455e7596e6b849fa5cd3c73c5b8e',
    'sitemap.xml':'73d3fc9db40daac0810725e3d4210fb7790ebae94b78f024300bd0301cbf6e03',
}.items():
    p = ROOT / rel
    if not p.exists(): die(f'baseline guard: missing {rel}')
    got = hashlib.sha256(p.read_bytes()).hexdigest()
    if got != sha:
        die(f'baseline guard failed for {rel}: {got}')

raw = base64.b64decode(PAYLOAD_B64.read_bytes())
tar_bytes = lzma.decompress(raw)
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    with tarfile.open(fileobj=io.BytesIO(tar_bytes), mode='r:') as tf:
        tf.extractall(td, filter='data')
    patch = json.loads((td / '_phase129_patch.json').read_text(encoding='utf-8'))
    for p in td.rglob('*'):
        if not p.is_file() or p.name == '_phase129_patch.json':
            continue
        rel = p.relative_to(td)
        out = ROOT / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(p, out)

rel = 'assets/search-ja-smartphone.json'
data = json.loads(read_text(rel))
new_urls = {x['url'] for x in patch['search_prepend']}
data = [x for x in data if x.get('url') not in new_urls]
data = patch['search_prepend'] + data
write_text(rel, json.dumps(data, ensure_ascii=False, indent=2) + '\n')

rel = 'assets/styles.css'
s = read_text(rel)
marker = '/* Phase129: homepage hierarchy, evidence labels, maintenance-friendly UX */'
if marker not in s:
    s += patch['css_append']
write_text(rel, s)

rel = 'ja/articles/index.html'
s = read_text(rel).replace(OLD_RELEASE, NEW_RELEASE)
if 'iphone-18-pro-japan-esim-only-physical-sim-migration/' not in s:
    section = '<section class="article-section" id="phase100-verification-ledger">'
    grid = '<div class="card-grid">'
    pos = s.index(grid, s.index(section)) + len(grid)
    s = s[:pos] + patch['articles_insert'] + s[pos:]
write_text(rel, s)

rel = 'ja/technology/smartphone/index.html'
s = read_text(rel).replace(OLD_RELEASE, NEW_RELEASE)
if 'id="phase128-market-guides"' not in s:
    anchor = '<section class="section phase114-public-surface"'
    pos = s.index(anchor)
    s = s[:pos] + patch['hub_insert'] + s[pos:]
write_text(rel, s)

rel = 'rss-ja.xml'
s = read_text(rel)
if 'iphone-18-pro-japan-esim-only-physical-sim-migration/' not in s:
    anchor = '  <channel>\n    '
    pos = s.index(anchor) + len(anchor)
    s = s[:pos] + patch['rss_insert'] + s[pos:]
write_text(rel, s)

rel = 'sitemap.xml'
s = read_text(rel)
if 'iphone-18-pro-japan-esim-only-physical-sim-migration/' not in s:
    pos = s.rindex('</urlset>')
    ins = patch['sitemap_insert']
    if not ins.startswith('<'): ins = '<' + ins
    if ins.endswith('<'): ins = ins[:-1]
    s = s[:pos] + ins + s[pos:]
write_text(rel, s)

for p in (ROOT / 'ja').rglob('*.html'):
    s = p.read_text(encoding='utf-8')
    t = s.replace('>Menu<', '>メニュー<')
    if t != s:
        p.write_text(t, encoding='utf-8')

ignore_prefixes = ('.phase129-deploy', '.github/workflows/apply-phase129.yml')
files = []
for p in ROOT.rglob('*'):
    if not p.is_file() or '.git' in p.parts:
        continue
    rel = p.relative_to(ROOT).as_posix()
    if any(rel.startswith(x) for x in ignore_prefixes):
        continue
    files.append(p)
files.sort(key=lambda p: p.relative_to(ROOT).as_posix())
if len(files) != EXPECTED_COUNT:
    die(f'QA file-count mismatch: {len(files)} != {EXPECTED_COUNT}')
h = hashlib.sha256()
for p in files:
    rel = p.relative_to(ROOT).as_posix().encode()
    fh = hashlib.sha256(p.read_bytes()).hexdigest().encode()
    h.update(rel + b'\0' + fh + b'\n')
got = h.hexdigest()
if got != EXPECTED_DIGEST:
    die(f'QA aggregate mismatch: {got} != {EXPECTED_DIGEST}')
site = read_text('sitemap.xml')
if site.count('<loc>') != 802:
    die(f'QA sitemap count mismatch: {site.count("<loc>")} != 802')
print('PHASE129_QA_PASS')
print(f'files={len(files)} aggregate={got} sitemap_urls=802')
