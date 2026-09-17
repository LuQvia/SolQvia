#!/usr/bin/env python3
from pathlib import Path
import base64, hashlib, io, lzma, shutil, tarfile, tempfile, json

ROOT = Path.cwd()
PAYLOAD = ROOT / '.phase130-payload.b64'
BASELINE = {
    'ja/technology/smartphone/device-passport/index.html': '43dd3ce32a6ac8bc3add85fcdf45693edea305673de85b61f382b74521f86119',
    'ja/technology/smartphone/index.html': '4f81e8b63c0131cf3eca60c660a6862020755b5220f0d021d150388075cece08',
}
EXPECTED = {
    'assets/data/phase130-coverage-gap-audit-v1.json': '58d4a4cf753891531b2c2b9acc53e5e6e07c6fb86e46d503c516ad5711c43e45',
    'assets/data/phase130-release-manifest-v1.json': '1bac1c8c6293e27fa150d3fc0ff818a396781c771c4d8c3e2450cea4b1203678',
    'assets/data/phase130-source-evidence-registry-v1.json': 'a8740ae9f412852cbc5eecdb17089b7902e95574a56bd90ae43c669ba3420d4a',
    'assets/data/phase130-unified-capability-taxonomy-v1.json': 'd998366cb1c68ad937561b81f67e4a0ad1012f5d58d35b0e8569d819246fdd3d',
    'assets/phase110-device-passport.css': '876372175d1feb2a96074b4bc3d2803e240a8611e5bc930fee2f64935c4d1436',
    'assets/phase110-device-passport.js': '56d564ea1e69f4e7c8aca98e5905f08af56a38ba4cdb40853a41874c5ab4bcc8',
    'ja/technology/smartphone/device-passport/index.html': '3aeb62aa74f3d42bb785858f5ba3502da7117cb9079ca3af18cbf56f7440dc11',
    'ja/technology/smartphone/index.html': 'eb429d12868f37ffaa1467132f31885eb6e3600ed2ce214b6885ee0d38141621',
}

def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def die(msg):
    raise SystemExit(msg)

for rel, sha in BASELINE.items():
    p = ROOT / rel
    if not p.exists(): die(f'baseline missing: {rel}')
    got = digest(p)
    if got != sha: die(f'baseline mismatch {rel}: {got}')

raw = base64.b64decode(PAYLOAD.read_bytes())
tar_bytes = lzma.decompress(raw)
with tempfile.TemporaryDirectory() as td:
    td = Path(td)
    with tarfile.open(fileobj=io.BytesIO(tar_bytes), mode='r:') as tf:
        tf.extractall(td, filter='data')
    for rel in EXPECTED:
        src = td / rel
        if not src.exists(): die(f'payload missing: {rel}')
        dst = ROOT / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dst)

for rel, sha in EXPECTED.items():
    got = digest(ROOT / rel)
    if got != sha: die(f'expected hash mismatch {rel}: {got}')

site = (ROOT / 'sitemap.xml').read_text(encoding='utf-8')
if site.count('<loc>') != 802: die(f'sitemap count mismatch: {site.count("<loc>")}')

for rel in [x for x in EXPECTED if x.endswith('.json')]:
    json.loads((ROOT / rel).read_text(encoding='utf-8'))

hub = (ROOT / 'ja/technology/smartphone/index.html').read_text(encoding='utf-8')
passport = (ROOT / 'ja/technology/smartphone/device-passport/index.html').read_text(encoding='utf-8')
if 'Unified Smartphone Intelligence' not in hub: die('hub marker missing')
if 'phase130' not in passport.lower(): die('passport phase130 marker missing')

print('PHASE130_QA_PASS')
print('sitemap_urls=802 patched_files=8')
