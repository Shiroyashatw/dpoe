"""產 summary.md（只整理數據，不下結論）。用法：python3 -I summary.py <RAW> <evidence 資料夾> <commit sha>"""
import sys, os, json, csv, collections

RAW, OUT, SHA = sys.argv[1], sys.argv[2], sys.argv[3]
st = json.load(open(os.path.join(RAW, '_stats.json'), encoding='utf-8'))
rows = list(csv.DictReader(open(os.path.join(OUT, 'contrast.csv'), encoding='utf-8')))
logs = {s: json.load(open(os.path.join(RAW, s, '_log.json'), encoding='utf-8')) for s in ('portrait', 'desktop')}
ver = next((l.get('ver') for l in logs['desktop']['log'] if l.get('ver')), '?')
fonts = sorted(set(sum([l.get('fonts', []) for s in logs for l in logs[s]['log']], [])))
L = []
w = L.append
w('# dpoe 視覺量測 1117（只有數據）\n')
w('## Build 與環境\n')
w(f'- 遊戲版本（頁面上的 `VER`）：**{ver}**；原始碼 commit `{SHA}`（= `origin/main` 量測當時的 HEAD）。')
w('- **沒有量到線上版**：這個雲端工作階段的對外代理拒絕連到 `shiroyashatw.github.io`（CONNECT 403，`connect_rejected`），'
  '所以改在本機用 `python3 -m http.server 8000` 開同一個 commit 的檔案量測。GitHub Pages 部署的是 `main`，'
  '但線上實際部署的版本是否就是這個 commit，這裡沒辦法確認。')
w('- 瀏覽器：Playwright 1.5x＋預裝 Chromium（`/opt/pw-browsers/chromium`，headless）。Supabase 請求全部擋掉（本機本來就不連雲端）。')
w(f'- 字型：Google Fonts 連得到，量測時已載入 {", ".join(fonts)}。')
w('- 尺寸 A `portrait`：390×844、deviceScaleFactor 3、isMobile＋hasTouch（截圖 1170×2532）。')
w('- 尺寸 B `desktop`：1280×720、deviceScaleFactor 1、滑鼠。\n')

w('## 走到的畫面\n')
w('每個畫面都是新存檔（localStorage 清空）一路走下來；遊戲狀態用頁面上已有的全域函式推進（沒有改任何程式），每張怎麼到的寫在「怎麼到」。')
w('進戰鬥前先塞了資料讓面板有東西：倉庫 24 件 `dropItem`、靈魂 12000、每種通貨 +7、木 800、`S.camp.forge=3`、`S.camp.altar=2`（天賦樹那張再設 4）、`S.auto=1`。\n')
for s in ('portrait', 'desktop'):
    w(f'### {s}\n')
    w('| 畫面 | DOM 文字 | 被蓋住略過 | DOM 不合格 | canvas 字 | canvas 不合格 | 高彩度色數 | 平均飽和 | 平均明度 | 怎麼到 |')
    w('|---|---|---|---|---|---|---|---|---|---|')
    for l in logs[s]['log']:
        n = l['screen']
        if not l['ok']:
            w(f'| {n} | — | — | — | — | — | — | — | — | ❌ {l.get("err","")} |')
            continue
        c = st['contrast'][s].get(n, {})
        p = st['palette'][s].get(n, {})
        w(f'| {n} | {c.get("dom",0)} | {c.get("occluded",0)} | {c.get("fail",0)} | {c.get("canvas",0)} | {c.get("cfail",0)} | {p.get("accents","")} | {p.get("sat_mean","")} | {p.get("val_mean","")} | {l["how"]} |')
    w('')

w('## 走不到／沒量的畫面\n')
w('- **線上版本身**：代理擋住 github.io（見上）。')
w('- **主選單**：遊戲沒有獨立的主選單；新存檔第一個畫面是開場動畫的標題（「dungeonPOE」＋「開始」），截在 `01_開場動畫`。')
w('- **手機的 hover tooltip**：手機沒有 hover。物品說明在直立是「點一件 → 換裝卡（`.foot.sel`）」，不是 `#tip` 說明框，截在 `08_物品說明_點擊`；名詞說明點擊後出 `#ttip`（`21_名詞說明_點擊`）。遊戲沒有長按手勢，沒做長按。')
w('- **桌機名詞說明**：只 hover 不會出 `#ttip`，要點；`21_名詞說明_hover` 是 hover 後再 click。')
w('- **昇華石碑、山海寶盒**：`PANEL_LOCK`（`lockTxt("asc"/"box")`）要營地進度才開，這次沒有把存檔推到那裡，沒量。')
w('- **世界地圖、商人、NPC、序章**：0.5.2 起已從遊戲刪除（CLAUDE.md），不存在。')
w('- **手機橫向、其他尺寸**：不在本次要求的兩個尺寸內，沒量。')
w('- **帳號（雲端登入）面板**：本機不連雲端，沒量。\n')

for s in ('portrait', 'desktop'):
    rs = [r for r in rows if r['size'] == s]
    d = [r for r in rs if not r['selector'].startswith('canvas')]
    c = [r for r in rs if r['selector'].startswith('canvas')]
    w(f'## {s} 不合格數量\n')
    w(f'- DOM 文字：{len(d)} 筆量測，最不利背景下不合格 **{sum(r["pass"]=="0" for r in d)}** 筆；最常見背景下不合格 {sum(float(r["ratio_common"])<float(r["threshold"]) for r in d)} 筆。')
    uq = {(r['selector'], r['text_sample']) for r in d if r['pass'] == '0'}
    w(f'  - 去掉跨畫面重複（同 selector＋同文字）後：{len(uq)} 種。')
    w(f'- canvas 文字（`fillText`）：{len(c)} 筆，不合格 **{sum(r["pass"]=="0" for r in c)}** 筆（取樣方式不同，見限制）。')
    faded = sum(v.get('canvas_faded', 0) for v in st['contrast'][s].values())
    w(f'  - 另有 {faded} 筆透明度 < 0.1（淡出中的跳數字）不計。\n')

def top(rs, n=20):
    seen, out = set(), []
    for r in sorted(rs, key=lambda r: float(r['ratio_worst'])):
        k = (r['size'], r['selector'], r['text_sample'], r['text_hex'], r['bg_hex_worst'])
        if k in seen:
            continue
        seen.add(k)
        out.append(r)
        if len(out) >= n:
            break
    return out

def tbl(rs):
    w('| # | 尺寸 | 畫面 | selector | 文字 | px | 粗 | 文字色 | 常見背景 | 最不利背景 | 比（常見） | 比（最不利） | 門檻 | CSS | 行 |')
    w('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
    for i, r in enumerate(rs, 1):
        w(f'| {i} | {r["size"]} | {r["screen"]} | `{r["selector"]}` | {r["text_sample"][:16].replace("|","/")} | {r["font_px"]} | {r["weight"]} | `{r["text_hex"]}` | `{r["bg_hex_common"]}` | `{r["bg_hex_worst"]}` | {r["ratio_common"]} | {r["ratio_worst"]} | {r["threshold"]} | {r["css_token"].replace("|","/")[:70]} | {r["css_line"]} |')
    w('')

w('## 對比最差前 20 名（DOM 文字，照最不利背景排序；同 selector＋文字＋顏色跨畫面只列一次）\n')
tbl(top([r for r in rows if not r['selector'].startswith('canvas')]))
w('## 對比最差前 20 名（canvas 文字，參考）\n')
tbl(top([r for r in rows if r['selector'].startswith('canvas')]))
w('## 對比最差前 20 名（DOM，照最常見背景排序）\n')
dd = [r for r in rows if not r['selector'].startswith('canvas')]
seen, o = set(), []
for r in sorted(dd, key=lambda r: float(r['ratio_common'])):
    k = (r['size'], r['selector'], r['text_sample'])
    if k not in seen:
        seen.add(k), o.append(r)
    if len(o) >= 20:
        break
tbl(o)

w('## 量測方法\n')
w('1. `tools/capture.js`：頁面一載入就包一層 `requestAnimationFrame`（可凍結）與 `CanvasRenderingContext2D.fillText`／`strokeText`（記下每一格畫的字、字型、fillStyle、globalAlpha、轉換後的外框、緊接著的描邊）。')
w('2. 每個畫面：凍結 rAF＋暫停所有 CSS 動畫與 transition → 截圖（`shots/`）→ 在頁面裡列出所有非空白文字節點的父元素：')
w('   - 外框：`Range.getClientRects()`，裁到視窗內；中心點 `elementFromPoint`（暫時把所有元素設 `pointer-events:auto`）不是自己或祖先／子孫的算「被蓋住」，不列入 CSV。')
w('   - 文字色：computed `-webkit-text-fill-color`／`color` 的 alpha × 自己到 `<html>` 每一層的 `opacity`。')
w('   - 字級、粗細；大字＝≥24px 或 ≥18.66px 且粗細 ≥700；門檻一般 4.5、大字 3.0。')
w('   - CSS 對應：在 `css/style.css` 的規則（含符合目前 `@media` 的）裡，從元素往上找第一個有寫 `color` 的元素，取**原始碼順序最後一條**符合的規則（沒有算 specificity）；背景同理，往上找第一個背景不透明或有背景圖的元素。`css_token` 列出 `var(--x)`，沒有變數就寫原始值；`css_line` 是那條規則裡該屬性所在行（`c:` 文字色、`bg:` 背景）。行內 style 寫 `(inline style)`。')
w('3. 再加一層樣式把所有 DOM 文字（含 ::before/::after、SVG text）設成透明、拿掉 text-shadow，重拍一張背景圖（沒有放進 repo，可重現）。')
w('4. `tools/analyze.py`：每個文字外框（外擴 2 CSS px，乘 dpr）在背景圖裡取像素：')
w('   - 最常見色＝出現最多次的像素色；最不利色＝佔外框面積 ≥2% 的顏色裡，跟文字對比最低的那個（去掉反鋸齒雜點）。')
w('   - 文字色有 alpha 時先跟該背景色合成，再算 WCAG 2.x 相對亮度對比。')
w('   - canvas 字：無法單獨隱藏，改取原截圖裡外框**外面一圈**（2 CSS px 寬）的像素；`note` 欄寫有沒有描邊（`strokeText` 的顏色與寬度），對比沒有把描邊算進去。')
w('5. 配色：每張截圖縮成每個 CSS 像素一格（BOX 平均），Pillow median-cut 量化成 16 色，輸出 hex、面積%、HSV（`palette.csv`）。「高彩度色數」＝16 色裡 S≥0.5、V≥0.5、面積 ≥0.5% 的個數。飽和度與明度分布（0–0.2…0.8–1 五段、%）在下面。\n')
w('## 飽和度與明度分布（% 像素，五段：0–.2／.2–.4／.4–.6／.6–.8／.8–1）\n')
w('| 尺寸 | 畫面 | 飽和度 | 明度 |')
w('|---|---|---|---|')
for s in ('portrait', 'desktop'):
    for n, p in st['palette'][s].items():
        w(f'| {s} | {n} | {" / ".join(map(str, p["sat_bins"]))} | {" / ".join(map(str, p["val_bins"]))} |')
w('')
w('## 限制\n')
w('- 量的是本機同 commit，不是線上部署（見上）。')
w('- 遊戲在跑（自動戰鬥、亂數），每次重跑怪物位置、跳數字、掉落都不同；DOM 面板的數字穩定，戰鬥畫面 canvas 的數字會變。凍結 rAF 只保證「文字圖」與「背景圖」是同一格。')
w('- 「最不利背景」包含外框內任何佔 ≥2% 的顏色，可能是相鄰的圖示、邊框或格子線，不一定是文字真正壓在上面的那塊；一律附上「最常見背景」對照。')
w('- 文字的 text-shadow、-webkit-text-stroke 沒有算進對比（只在 `note` 標出）；canvas 的描邊同樣沒有算進對比。')
w('- `css_token` 只照原始碼順序找最後一條符合的規則，沒有算 specificity 與 `!important`，少數元素可能對到被覆蓋的規則；背景 token 是 DOM 祖先的背景，若文字其實疊在 canvas 上（例如 HUD 的掉落紀錄 `#dlog`），像素背景是 canvas，token 是 body 的。')
w('- 像素背景是 dpr 倍率的實際像素（直立 ×3），字型反鋸齒、次像素不影響（文字已隱藏）。')
w('- 圖示字（emoji、像素圖 icon）若不是 DOM 文字就不在 CSV 裡；SVG 圖示沒量。')
w('- `13_產生器_林場展開` 與 `14_營地設施_鍛造台展開` 的展開內容在面板裡可能要捲動，截圖只含視窗內看得到的部分。\n')
w('## 檔案\n')
w('- `shots/{portrait,desktop}/<畫面>.png`、`contrast.csv`、`palette.csv`')
w('- `tools/capture.js`（截圖＋列文字）、`tools/analyze.py`（對比＋配色）、`tools/summary.py`（這份）')
w('- 重現：repo 根目錄 `python3 -m http.server 8000`；`node evidence/visual-audit-1117/tools/capture.js portrait http://localhost:8000/ <RAW>`（desktop 同）；`python3 -I evidence/visual-audit-1117/tools/analyze.py <RAW> evidence/visual-audit-1117 .`；`python3 -I evidence/visual-audit-1117/tools/summary.py <RAW> evidence/visual-audit-1117 <sha>`')
open(os.path.join(OUT, 'summary.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('ok', len(L))
