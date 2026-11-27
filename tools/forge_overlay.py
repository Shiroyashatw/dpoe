"""鍛造 v1.0 疊圖：定稿示意圖（uiux/forge-final-1126 @ 29cf8106，DPR 2、舞台在 (40,40) 2560×1440）裁出舞台縮成 1280×720，
跟 tools/forge_shots.js 拍的實機圖 50% 疊在一起，存成 <編號>-疊圖.jpg。
用法：python3 tools/forge_overlay.py [資料夾 docs/production/evidence/forge/shots-1126]"""
import io
import subprocess
import sys
from pathlib import Path

from PIL import Image

SRC = '29cf810654c7480c0e95a53e7af0cc0edf618edf'
REF = {
    'A01': '01-make', 'A02': '02-make-lack', 'A03': '03-make-reveal', 'A03b': '03b-make-reveal-jackpot',
    'A03c': '03c-make-reveal-20', 'A04': '04-auto-salvage', 'A05': '05-bench-empty', 'A06': '06-fill',
    'A07': '07-fill-dust', 'A07b': '07b-fill-cauldron', 'A08': '08-fill-conv', 'A09': '09-fill-foresight',
    'A10': '10-fill-joy-pick', 'A11': '11-fill-lack', 'A12': '12-temper', 'A13': '13-holy', 'A14': '14-corrupt',
    'A15': '15-corrupt-confirm', 'A16': '16-calamity', 'A17': '17-calamity-pick',
}
out = Path(sys.argv[1] if len(sys.argv) > 1 else 'docs/production/evidence/forge/shots-1126')
for k, ref in REF.items():
    shot = out / f'{k}-實機.png'
    if not shot.exists():
        print('沒有', shot)
        continue
    raw = subprocess.run(['git', 'show', f'{SRC}:docs/production/evidence/forge/{ref}.png'], capture_output=True, check=True).stdout
    st = Image.open(io.BytesIO(raw)).convert('RGB').crop((40, 40, 2600, 1480)).resize((1280, 720), Image.LANCZOS)
    me = Image.open(shot).convert('RGB').resize((1280, 720))
    Image.blend(st, me, 0.5).save(out / f'{k}-疊圖.jpg', quality=82)
    print(k, 'ok')
