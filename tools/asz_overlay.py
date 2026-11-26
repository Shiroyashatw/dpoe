"""昇華、山海寶盒、地點 v1.0 疊圖：定稿示意圖（uiux/shanhai-zones-final-1126 @ c8c7e66e，DPR 2、舞台在 (40,40) 2560×1440）裁出舞台縮成 1280×720，
跟 tools/asz_shots.js 拍的實機圖 50% 疊在一起，存成 <編號>-疊圖.jpg。
用法：python3 tools/asz_overlay.py [根目錄 docs/production/evidence]"""
import io
import subprocess
import sys
from pathlib import Path

from PIL import Image

SRC = 'c8c7e66e7e24940ed5f8bf4bfabcee9b912934b6'
REF = {
    'ascend': {'A01': 'A01-locked', 'A02': 'A02-select', 'A03': 'A03-detail-alloc', 'A04': 'A04-detail-lack',
               'A05': 'A05-switch-confirm', 'A06': 'A06-reset-confirm'},
    'shanhai': {'B01': 'B01-overview', 'B02': 'B02-lack', 'B03': 'B03-dream', 'B04': 'B04-rift-gods', 'B05': 'B05-salvage'},
    'zones': {'C01': 'C01-list', 'C02': 'C02-star', 'C03': 'C03-locked', 'C04': 'C04-special'},
}
root = Path(sys.argv[1] if len(sys.argv) > 1 else 'docs/production/evidence')
for g, L in REF.items():
    out = root / g / 'shots-1126'
    for k, ref in L.items():
        shot = out / f'{k}-實機.png'
        if not shot.exists():
            print('沒有', shot)
            continue
        raw = subprocess.run(['git', 'show', f'{SRC}:docs/production/evidence/{g}/{ref}.png'], capture_output=True, check=True).stdout
        st = Image.open(io.BytesIO(raw)).convert('RGB').crop((40, 40, 2600, 1480)).resize((1280, 720), Image.LANCZOS)
        me = Image.open(shot).convert('RGB').resize((1280, 720))
        Image.blend(st, me, 0.5).save(out / f'{k}-疊圖.jpg', quality=82)
        print(g, k, 'ok')
