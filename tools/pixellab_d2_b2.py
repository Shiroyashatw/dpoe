#!/usr/bin/env python3
"""M2-36 D2 第二批（specs/M2-36-pixellab-d2-batch2.md §0 六項；畫法、鎖色、body、後處理照主檔 M2-36-pixellab-d2.md）。

    python3 tools/pixellab_d2_b2.py sheet               # 寫 art/_tmp/m2-36-d2-b2/jobs-<項>.json
    python3 tools/pixellab_d2_b2.py run <項> [--go] [--threads 4]   # 項 1–6；沒加 --go 只預覽
    python3 tools/pixellab_d2_b2.py repost5221          # 首跑 walltop s5221 用新 post（drop 0）重做，當備案（0 次）
    python3 tools/pixellab_d2_b2.py report <項>          # results-<項>.md、contact-<項>-{1x,4x}.png，再合併 results.md
金鑰只讀環境變數（或由代理注入）；不印、不存。已有原圖的種子跳過；失敗只記 failures.json，不重跑。
"""
import argparse, base64, io, json, pathlib, re, sys, threading, time
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import pixellab_batch as pb
import pixellab_d2_first as d1

OUT = pb.ROOT / 'art/_tmp/m2-36-d2-b2'
FIRST = pb.ROOT / 'art/_tmp/m2-36-d2-first'
ICON, BIT, BITNEG, TILE = d1.ICON, d1.BIT, d1.BITNEG, d1.TILE
STONE = d1.STONE
TBASE = ['#000000', '#33302b', '#615b56', '#aeaba7', '#e8e5e1']  # batch2 §1、§3 共用
ACC = {'火': ['#ee9978'], '冰': ['#ade2f9'], '雷': ['#f3f9a4'], '混': ['#e97ccf'], '命': ['#934341', '#af6c64'], '魔': ['#3a5b98', '#6b7dad'],
       '綠': ['#95e886'], '金': ['#f2cb9b'], '無': []}
TNOT = 'text, letters, numerals, face, skull, circle frame, node ring, background disc, gradient glow'

KEYSTONE = """tk_judge 金 a straight arrow stuck dead centre in a round target, bold and simple
tk_phalanx 無 a wall of three overlapping square iron shield plates
tk_hunter 無 three arrows falling from above in a narrow fan
tk_master 綠 a winged boot with three wind streaks behind it
tk_shadow 混 a pale crystal heart inside a hexagon, purple mist kept outside the hexagon
tk_bloodclaw 命 a rolled contract scroll sealed with one large blood drop
tk_storm 火 a standing human silhouette made entirely of flame, no face
tk_medium 魔 a blue mana orb held in front of a red heart like a shield
tk_bloodmage 命 a broken blue orb ring with a red drop falling through the gap
tk_bonelord 無 a small bone crown above two wolf silhouettes standing side by side
tk_peach 無 a heavy anchor planted at the foot of a small mountain
tk_banner 金 two short carved totem poles joined by a rope
tk_scythe 命 a dark crescent scythe blade with a red cutting edge
tk_circular 金 three curved arrows chasing each other in a closed circle
tk_knightly 金 a knight lance crossed with a short pennant
tk_irongrip 無 an iron gauntlet gripping a thick metal bar
tk_ironwill 魔 a closed steel helm with one blue gem on the brow, no face
tk_stance 無 a square boulder planted on cracked ground
tk_rolltank 無 a tower shield tilted mid-roll with one motion arc
tk_esmana 魔 a blue mana drop wrapped in a pale thin shield ring
tk_inevcrit 雷 a sword point meeting a small four-point burst exactly at the tip
tk_deflect 無 an arrow glancing off a curved feather, the arrow bent away
tk_crimson 命 three crimson forward chevrons stacked left to right"""

NOTABLE = """tn_base 無 a small four-point star
tn_life 命 a plain bold heart
tn_armour 無 a breastplate seen from the front
tn_block 無 a round shield with a centre boss
tn_melee 無 a short broad sword pointing up
tn_atkspd 無 a sword with two speed lines beside the blade
tn_proj 無 a single arrow flying right with fletching
tn_evade 綠 a feather curving sideways
tn_crit 雷 an open eye shape made only of lines, centred dot, no face
tn_critdmg 命 a jagged burst with a cracked centre
tn_acc 無 a crosshair over a small target dot
tn_trap 無 an open bear trap with teeth
tn_ail 混 a drop with a swirl inside
tn_elem 火 three small shapes in a triangle: flame, snowflake, bolt
tn_elemskill 冰 a staff head with a glowing crystal
tn_spell 魔 an open book with a spark above it
tn_es 魔 a hexagon shield made of light lines
tn_mpcd 魔 an hourglass with blue sand
tn_occult 混 a crescent moon over a small rune stone
tn_minion 無 a paw print
tn_aura 金 a lotus flower with a thin halo arc
tn_primal 綠 a sprouting leaf from a seed
tn_totem 無 a short carved totem pole
tn_area 無 three expanding arcs from a centre dot
tn_attack 無 a fist striking forward
tn_phys 無 a heavy hammer head
tn_fire 火 a single flame
tn_cold 冰 a six-arm snowflake
tn_light 雷 a zigzag lightning bolt
tn_chaos 混 a spiral vortex
tn_bleed 命 three drops, two on top, one below
tn_poison 綠 a bubbling flask drop with one bubble
tn_leech 命 a fang with one red drop
tn_regen 綠 a heart with a small plus beside it
tn_strike 無 a mace head with impact lines
tn_heavy 無 a hammer coming down on a crack
tn_stun 雷 three small stars circling a dot
tn_tough 無 a flexed arm
tn_thorns 綠 a thorny vine loop
tn_deflect 無 an arrow bending off a small shield edge
tn_duration 金 a sundial
tn_curse 混 a hanging talisman tag with one mark, no readable text
tn_rage 命 a clenched fist with flame-shaped streaks
tn_parry 無 two crossed blades meeting at one spark"""

SMALL = """ts_attack 無 a single sword, bold
ts_phys 無 a fist
ts_fire 火 a flame
ts_cold 冰 a snowflake
ts_light 雷 a bolt
ts_chaos 混 a spiral
ts_bleed 命 one blood drop
ts_poison 綠 a green drop with a bubble
ts_ignite 火 a small flame on an ember
ts_life 命 a heart
ts_mana 魔 a blue orb
ts_es 魔 a hexagon outline
ts_armour 無 a breastplate
ts_evade 綠 a feather
ts_block 無 an anvil
ts_crit 雷 an eye made of lines, no face
ts_speed 無 a wing
ts_proj 無 an arrow
ts_area 無 concentric arcs
ts_minion 無 a paw
ts_flask 命 a small flask
ts_curse 混 a talisman tag
ts_aura 金 a lotus
ts_attr 金 a four-point star"""

BOSS_BODY = ('game boss sprite, full body, standing, facing the viewer at three-quarter angle, {d}, dark fantasy Chinese mythology, centred, '
             'feet near the bottom edge, light from the top-left, no text, no background, no ground shadow, no frame, no UI')
BOSSES = [  # id、palette（不含 #000000）、<DESC>、<NOT>
    ('boss_taisui', '#2a1c18 #5a2a22 #934341 #c43d24 #f2cb9b #e8e5e1 #615b56',
     'a towering star-lord general in dark red lacquered armour with pale gold trim, a long halberd, a ring of twelve small round medallions floating behind his back',
     'angel, wings, halo, white robe'),
    ('boss_chiyou', '#1f1a16 #4a3a2a #7a5a3a #a07a4a #6b7d6a #aeaba7 #e2552c',
     'a giant bull-horned war god with bronze armour and copper-green skin, four arms holding a dagger-axe, a short sword and a round shield, low mist at his feet',
     'red devil, bat wings, trident'),
    ('boss_xingtian', '#1f1a16 #4a3a2a #7a5a3a #8a6c4e #934341 #aeaba7 #e8e5e1',
     'a headless giant warrior, two eyes on his chest and a mouth at his navel, a large axe in one hand and a square shield in the other, mid-dance stance',
     'head, helmet, ice armour, skeleton'),
    ('boss_fengbo', '#1f2a26 #3a4a40 #6b7d6a #a9ae68 #aeaba7 #e8e5e1 #ade2f9',
     'a deer-bodied beast with a bird head and a snake tail, carrying an open cloth wind bag, swirling wind ribbons around it', 'eagle only, griffin, dragon'),
    ('boss_yushi', '#141c26 #22344a #3a5b98 #6b7dad #ade2f9 #aeaba7 #e8e5e1',
     'an old rain master in dark blue robes pouring rain from a bowl, a small black dragon coiled around his shoulders, falling rain streaks',
     'sea serpent only, fish, trident'),
    ('boss_e', '#1a1618 #3a2e34 #615b56 #8a6a7a #e97ccf #aeaba7 #e8e5e1',
     'a gaunt grey demon in tattered dark robes, a sneering mask, both hands thrust forward pushing something away', 'mirror, knight armour, cute'),
    ('boss_yu', '#1f1a16 #4a3a2a #7a5a3a #a07a4a #f2cb9b #934341 #e8e5e1',
     'a bloated greedy demon with a huge grinning mouth, clutching strings of square-holed copper coins and a sack of ingots', 'goblin, small imp, paper scroll'),
]
SLOTS = """slot_weapon a straight sword pointing up-right at 45 degrees, plain guard
slot_focus a small orb resting on a short three-prong holder
slot_shield a kite shield seen front-on, plain face
slot_helm a simple open-face helmet seen front-on, empty inside, no face
slot_chest a breastplate with shoulder guards seen front-on
slot_gloves one gauntlet, fingers up, back of the hand toward the viewer
slot_boots one boot in side view, toe pointing left
slot_belt a belt in a gentle arc with a square buckle in the centre
slot_ring a plain ring seen at a slight angle, no gem
slot_quiver a quiver at 45 degrees with three arrow fletchings sticking out
slot_amulet a pendant on a V-shaped chain, plain round pendant"""
SLOTNOT = 'text, numerals, gem glow, rarity colour, frame, background disc, hand, character'

# 主檔 §2 #5–19：表上沒列主色，依描述從主檔 §0 色表取 2–4 色（palette＝#000000＋主色＋#46413c #817b75 #e8e5e1）
CUR = [
    ('cur_trans', 5321, 'a small dull blue-grey transmutation stone, round, not a coin', '#3a5b98 #6b7dad #aeaba7'),
    ('cur_aug', 5323, 'a small cyan-grey stone with a tiny plus notch, not letters', '#ade2f9 #aeaba7 #615b56'),
    ('cur_regal', 5325, 'a faceted stone with a tiny crown pip, not coins', '#f2cb9b #aeaba7 #615b56'),
    ('cur_exalt', 5327, 'a pale stone with two short wing ticks, not a bird, not orange', '#fbf9f6 #aeaba7 #615b56'),
    ('cur_chaos', 5329, 'a stone with a muted red-violet and grey swirl core, not a yin-yang', '#934341 #e97ccf #615b56 #aeaba7'),
    ('cur_wish', 5331, 'a small four-point star stone, not a snowflake, not a sun', '#f3f9a4 #fbf9f6 #aeaba7'),
    ('cur_whet', 5333, 'a flat grey whetstone bar, not a blade, not a brick wall', '#33302b #615b56 #aeaba7'),
    ('cur_scrap', 5335, 'a small bent metal plate scrap, not a full shield, not a coin', '#33302b #615b56 #aeaba7'),
    ('cur_prism', 5337, 'a short crystal prism, muted facets, no rainbow glow', '#caaef4 #ade2f9 #aeaba7'),
    ('cur_vaal', 5339, 'a dark red corked vial stone, not a health flask', '#33302b #934341 #af6c64'),
    ('cur_eng', 5341, 'a teal-grey rune tablet chip, one simple mark, no readable letters', '#33302b #6b7d6a #aeaba7'),
    ('soulpack', 5349, 'a small tied pouch with one wisp leak, not a coin purse', '#615b56 #caaef4 #6b7dad #fbf9f6'),
    ('cur_calam', 5351, 'a darker corrupted stone with one hooked crack, distinct from cur_vaal', '#25211e #8a6a7a #e97ccf'),
    ('cur_pcalam', 5353, 'like cur_calam with a sharper pale facet, not winged', '#25211e #8a6a7a #e97ccf #fbf9f6'),
    ('cur_pen', 5355, 'a short calligraphy brush, tip down, not a sword', '#33302b #6b5440 #8a6c4e'),
]
PROPS = [
    ('prop_lantern', 5241, '#3f3226 #6b5440 #8a6c4e #b98a5e', 'a hanging warm brown cloth lantern in a dark wood frame, not white, no baked glow', 0),
    ('prop_ash', 5243, '#33302b #46413c #615b56 #aeaba7', 'a low pile of paper ash and burnt scraps, flat, no flame, no ember glow', 0),
    ('prop_joss', 5245, '#33302b #46413c #615b56 #e8e5e1 #f2cb9b',
     'a small stack of burnt joss paper, charred edges, mostly grey, only a hint of pale gold on unburnt corners, no fire', 0),
    ('prop_stele', 5247, '#33302b #46413c #615b56 #817b75', 'a short broken square stone pillar stump, flat top, no glyphs, not a tombstone', 0),
    ('prop_crate', 5251, '#3f3226 #6b5440 #8a6c4e #a07a4a',
     'a closed wooden crate with a few split firewood logs beside it, warm brown wood, not a treasure chest, no gold', 1),
    ('prop_barrel', 5253, '#3f3226 #6b5440 #8a5a40 #8c7a4a #b3a592',
     'a wooden barrel, a basket of bread and a grain sack grouped unevenly, not round jars, not white, not in a row', 1),
    ('prop_rack', 5255, '#2e2a27 #3f3226 #6b5440 #8a6c4e #817b75', 'a low wooden weapon rack with two practice swords and a spear, not a scarecrow, not a cross, no stone ring', 1),
]
PROPNOT = 'logo, promo, character, monster, UI, white lantern, paper-white, saturated orange, unique orange fill'
CAMPNOT = 'incense, joss paper, crow, bone, skull, tattered cloth'
NAME = {1: '天賦樹圖示', 2: '牆重跑', 3: '首跑補跑（金幣、歸墟）', 4: '王替身圖＋物品部位圖示', 5: '其餘通貨 #5–19', 6: '營地與戰場道具'}


def icon(i, w, n, s0, desc, nots, pal, item, **kw):
    body = {'description': ICON.format(d=desc, n=nots), 'image_size': {'width': w, 'height': w}, 'view': 'side', 'outline': 'single color black outline',
            'shading': 'medium shading', 'detail': 'medium detail', 'no_background': True}
    return dict(id=i, item=item, endpoint='/create-image-pixflux', body=body, n=n, seed0=s0, post='alpha_binary', palette=pal, wave='D2b2', **kw)


def bit(i, n, s0, desc, nots, pal, item, **kw):
    body = {'description': BIT.format(d=desc), 'negative_description': BITNEG.format(n=nots), 'image_size': {'width': 16, 'height': 16}, 'no_background': True}
    return dict(id=i, item=item, endpoint='/create-image-bitforge', body=body, n=n, seed0=s0, post='alpha_binary', palette=pal, wave='D2b2', **kw)


def nots_of(desc):
    """「not a coin, not orange」→ coin, orange（bitforge 的 negative 用）"""
    return ', '.join(re.sub(r'^(a|an) ', '', m) for m in re.findall(r'\bnot? (?:a |an )?([^,]+)', desc)) or 'nothing'


def rows(text):
    return [l.split(' ', 2) for l in text.splitlines()]


def sheet():
    S = {k: [] for k in range(1, 7)}
    for tbl, size, n, s0, tier in ((KEYSTONE, 48, 4, 6001, 'tk'), (NOTABLE, 32, 3, 6201, 'tn'), (SMALL, 32, 3, 6401, 'ts')):
        for k, (i, acc, desc) in enumerate(rows(tbl)):
            kw = {'shrink': 16} if tier == 'ts' else {}
            S[1].append(icon(i, size, n, s0 + k * n, desc, TNOT, TBASE + ACC[acc], 1, tier=tier, **kw))
    wt = d1.tile('tile_d2_walltop', 32, 32, 3, 5321, 'wall_shift', STONE,
                 'the flat top of a thick stone wall seen from directly above, large rectangular capstones in two staggered rows, wide dark joints, a few chipped corners, '
                 'no horizon, no peaks, no side silhouette, no objects', d1.BATTLE, 1)
    wt.update(item=2, wave='D2b2', drop=0, init_file='art/tiles/temple/walltop/tile_temple_walltop-s1112.png', init_image_strength=300)
    wf = d1.tile('tile_d2_wallface', 64, 18, 3, 5331, 'face_shift', ['#25211e'] + STONE,
                 'two courses of large dressed stone blocks seen straight on, staggered, thin dark mortar joints, a few chipped edges, no doors, no windows, no text', d1.BATTLE, 1)
    wf['body']['description'] = wf['body']['description'].replace('seamless tileable texture, orthographic view from directly above',
                                                                  'horizontally seamless wall strip, straight-on front view')
    wf['body']['view'] = 'side'
    wf.update(item=2, wave='D2b2', drop=2, grade=True, init_image_strength=300,
              init_file=['art/tiles/temple/wallface/tile_temple_wallface-s1122-a.png', 'art/tiles/temple/wallface/tile_temple_wallface-s1122-b.png'])
    S[2] = [wt, wf]
    S[3] = [bit('cur_gold', 3, 5401, 'a single round cash coin with a square hole in the centre, seen straight on, pale gold face, warm grey rim, fills the canvas',
                'single ingot, crown, star, bright yellow, orange, stack, ingot, gem, octagon, stick', ['#000000', '#46413c', '#817b75', '#aeaba7', '#e8e5e1', '#f2cb9b'], 3),
            bit('wangyin_guixu_16', 3, 5510, 'a small square plaque with a small ring on top, front view, a single thin spiral line carved in the centre of the plaque face, '
                'glowing cyan, warm grey plaque body', 'cube, whirlpool landscape, face, figure, person, lightning, sword', d1.WY, 3,
                init_file='art/_tmp/m2-36-d2-first/wangyin_chixiao_16/post/wangyin_chixiao_16-s5404.png', init_image_strength=300)]
    for k, (i, pal, desc, nt) in enumerate(BOSSES):
        body = {'description': BOSS_BODY.format(d=desc) + ', no ' + nt, 'image_size': {'width': 64, 'height': 64}, 'view': 'side',
                'outline': 'single color black outline', 'shading': 'detailed shading', 'detail': 'highly detailed', 'no_background': True}
        S[4].append(dict(id=i, item=4, endpoint='/create-image-pixflux', body=body, n=4, seed0=6601 + 4 * k, post='alpha_binary',
                         palette=pal.split() + ['#000000'], wave='D2b2', tier='boss'))
    for k, (i, desc) in enumerate(l.split(' ', 1) for l in SLOTS.splitlines()):
        S[4].append(icon(i, 32, 3, 6701 + 3 * k, desc, SLOTNOT, TBASE, 4, tier='slot'))
    for i, s0, desc, main in CUR:
        S[5].append(bit(i, 3, s0, desc, nots_of(desc), ['#000000'] + main.split() + ['#46413c', '#817b75', '#e8e5e1'], 5))
    for i, s0, pal, desc, camp in PROPS:
        S[6].append(icon(i, 32, 3, s0, desc, PROPNOT + (', ' + CAMPNOT if camp else ''), pal.split() + ['#000000'], 6))
    want = {1: 296, 2: 6, 3: 6, 4: 61, 5: 45, 6: 21}
    OUT.mkdir(parents=True, exist_ok=True)
    for k, js in S.items():
        assert sum(j['n'] for j in js) == want[k], (k, sum(j['n'] for j in js))
        (OUT / f'jobs-{k}.json').write_text(json.dumps(js, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f'項 {k} {NAME[k]}：{len(js)} 個 id、{sum(j["n"] for j in js)} 張')


def load(k):
    return json.loads((OUT / f'jobs-{k}.json').read_text(encoding='utf-8'))


def stem_of(j, seed):
    return f"{j['id']}-s{seed}"


def raw_name(j, seed):
    """原圖檔名含尺寸：<id>-s<seed>-<寬>x<高>.png"""
    b = j['body']['image_size']
    return f"{stem_of(j, seed)}-{b['width']}x{b['height']}"


LOCK = threading.Lock()


def fail(j, seed, e):
    with LOCK:
        f = OUT / 'failures.json'
        fl = json.loads(f.read_text(encoding='utf-8')) if f.exists() else []
        m = re.match(r'API 錯誤 (\d+)：(.*)', str(e), re.S)
        fl.append({'item': j['item'], 'id': j['id'], 'seed': seed, 'code': m.group(1) if m else '-', 'error': (m.group(2) if m else str(e))[:300]})
        f.write_text(json.dumps(fl, ensure_ascii=False, indent=2), encoding='utf-8')


def one(j, seed):
    d = OUT / j['id']
    stem = raw_name(j, seed)
    try:
        body, note = pb.request(j, seed)
        t0 = time.time()
        for wait in range(60):  # 429 同時工作數已滿：沒開始生成、不花點，等一下再送（不算重跑）
            try:
                r = pb.http('POST', j['endpoint'], body)
                break
            except RuntimeError as e:
                if '429' not in str(e) or 'concurrent' not in str(e):
                    raise
                time.sleep(5 + wait)
        else:
            raise RuntimeError('API 錯誤 429：同時工作數一直滿，放棄')
        dt = time.time() - t0
        (d / 'post').mkdir(parents=True, exist_ok=True)
        im = Image.open(io.BytesIO(base64.b64decode(r['image']['base64'])))
        im.save(d / f'{stem}.png')
        info = pb.post(j, d, stem)
        if j.get('shrink'):  # 小點：32 原圖最近鄰縮 2× 成 16，再 alpha_binary
            s = j['shrink']
            st16 = f"{stem_of(j, seed)}-{s}x{s}"
            im.resize((s, s), Image.NEAREST).save(d / f'{st16}.png')
            pb.post(j, d, st16)
        req = {k2: ('(base64 略)' if isinstance(v, dict) and 'base64' in v else v) for k2, v in body.items()}
        r['image']['base64'] = '(存成 png，略)'
        meta = {'endpoint': 'POST /v2' + j['endpoint'], 'job': j['id'], 'seed': seed, 'item': j['item'], 'post': j['post'], **note, **info,
                'seconds': round(dt, 1), 'request': req, 'usage': r.get('usage'), 'response': r}
        (d / f'{stem}.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f'  完成 {stem} {im.size} {dt:.0f}s', flush=True)
        return True
    except Exception as e:
        print(f'  失敗 {j["id"]} s{seed}：{str(e)[:200]}', flush=True)
        fail(j, seed, e)
        return False


def run(k, go, threads):
    js = load(k)
    todo = [(j, j['seed0'] + i) for j in js for i in range(j['n']) if not (OUT / j['id'] / f"{raw_name(j, j['seed0'] + i)}.png").exists()]
    print(f'項 {k} {NAME[k]}：這次 {len(todo)} 張（共 {sum(j["n"] for j in js)}），預估 {len(todo)} 次生成')
    for j in js:
        b = j['body']
        print(f"- {j['id']} {b['image_size']['width']}×{b['image_size']['height']} {j['endpoint']} n={j['n']} 種子 {j['seed0']}–{j['seed0'] + j['n'] - 1} "
              f"post={j['post']}{' drop=' + str(j['drop']) if 'drop' in j else ''}{' grade' if j.get('grade') else ''}{' →' + str(j['shrink']) if j.get('shrink') else ''} "
              f"init={j.get('init_file', '-')} palette={' '.join(j['palette'])}")
        if not go:
            print(f"    description: {b['description']}")
            if 'negative_description' in b:
                print(f"    negative: {b['negative_description']}")
    if not go:
        return print('只是預覽，沒有送出。確認後加 --go')
    pb.SHEET = OUT / f'jobs-{k}.json'  # http 失敗改丟 RuntimeError（不 sys.exit）
    with ThreadPoolExecutor(threads) as ex:
        res = list(ex.map(lambda t: one(*t), todo))
    print(f'項 {k}：成功 {sum(res)}、失敗 {len(res) - sum(res)}')


def repost5221():
    """首跑 walltop s5221 原圖 → 新 post（wall_shift drop 0），存在 b2 的 tile_d2_walltop/ 當備案"""
    j = load(2)[0]
    d = OUT / j['id']
    (d / 'post').mkdir(parents=True, exist_ok=True)
    stem = 'tile_d2_walltop-s5221-32x32-repost'
    Image.open(FIRST / 'tile_d2_walltop/tile_d2_walltop-s5221.png').save(d / f'{stem}.png')
    pb.post(j, d, stem)
    print('備案', stem, '（0 次生成）')


# ---- 量測 ----
def sil(a):
    return a[..., 3] == 255


def iou(p, q):
    if p.shape != q.shape:
        return 0.0
    u = (p | q).sum()
    return float((p & q).sum() / u) if u else 0.0


def meanL(a):
    return float(pb.lab(a[..., :3]).mean(0).mean(0)[0]) if a.ndim == 3 else 0


def measure_wall(j, raw, posts):
    pal = j['palette']
    ar = d1.rgb(raw)
    dr, dmax = d1.drift(ar, np.ones(ar.shape[:2], bool), pal)
    ps = [d1.rgb(p) for p in posts]
    idxs = [pb.nearest(p[..., :3], pal)[0] for p in ps]
    iso = max(d1.isolated(i) for i in idxs)
    m = {'原圖 ΔE>3': f'{dr:.0%}', '原圖最大 ΔE': f'{dmax:.1f}', '放大圖': '是' if d1.is_upscaled(ar) else '否', '雜點': f'{iso:.1%}',
         '禁色': d1.banned(ar, np.ones(ar.shape[:2], bool))}
    ok = [not d1.is_upscaled(ar), iso <= 0.02, m['禁色'] == 0]
    Ls = [float(pb.lab(p[..., :3])[..., 0].mean()) for p in ps]
    if j['id'] == 'tile_d2_walltop':
        L, idx = Ls[0], idxs[0]
        lt = float((idx == 2).mean())
        sr = d1.seam_ratio(ps[0])
        m.update({'平均 L*': f'{L:.1f}', '#615b56': f'{lt:.0%}', '接縫比': f'{sr:.2f}'})
        ok += [32 <= L <= 38, 0.55 <= lt <= 0.90, sr <= 1.2]
    else:
        dark = [float((i <= 1).mean()) for i in idxs]
        row0 = all((i[0] == 2).all() for i in idxs)
        sr = d1.face_seam(*ps)
        m.update({'a/b 平均 L*': '／'.join(f'{x:.1f}' for x in Ls), 'a/b 暗二色': '／'.join(f'{x:.0%}' for x in dark), '第 0 列 #46413c': '是' if row0 else '否',
                  '接縫比': f'{sr:.2f}'})
        ok += [all(17 <= x <= 23 for x in Ls), all(x >= 0.85 for x in dark), row0, sr <= 1.2]
    return m, all(ok)


def measure_icon(j, raw, post, others):
    pal = j['palette']
    ar, ap = d1.rgb(raw), d1.rgb(post)
    on_r, on = ar[..., 3] >= 128, ap[..., 3] == 255
    dr, dmax = d1.drift(ar, on_r, pal)
    up = d1.is_upscaled(ar)
    bn = d1.banned(ar, on_r)
    cov = float(on.mean())
    ys, xs = np.nonzero(on)
    bb = max(np.ptp(ys) + 1, np.ptp(xs) + 1) / ap.shape[0] if on.any() else 0
    sat = float((d1.chroma(ap)[on] > 40).mean()) if on.any() else 0
    m = {'原圖 ΔE>3': f'{dr:.0%}', '原圖最大 ΔE': f'{dmax:.1f}', '放大圖': '是' if up else '否', '原圖半透明': int(((ar[..., 3] > 0) & (ar[..., 3] < 255)).sum()),
         '不透明': f'{cov:.0%}', '主形外框': f'{bb:.0%}', '禁色': bn, 'C*>40': f'{sat:.0%}'}
    ok = [not up, bn == 0, cov > 0.05]
    w = ap.shape[0]
    if w == 16:
        ck = d1.checker(ap, on)
        m['棋盤'] = ck
        ok.append(ck <= 6)
    t = j.get('tier', '')
    if t in ('tk', 'tn', 'ts'):
        ok.append(sat <= 0.25)
    if j['id'].startswith('wangyin'):
        ok.append(sat <= 0.35)
    lim = {'tk': 0.7, 'tn': 0.7, 'ts': 0.7, 'slot': 0.6}.get(t)
    if lim and others:
        mx = max(iou(sil(ap), sil(o)) for o in others)
        m['同表他 id 最大 IoU'] = f'{mx:.2f}'
        ok.append(mx < lim)
    return m, all(ok)


EYE = {'tk': '顯示 48 一眼認得主形、無圓框／字／臉；基石放 mumi 挑圖 Page', 'tn': '顯示 32 認得主形、無圓框／字／臉', 'ts': '顯示 16 認得、只 1 個主形 ≥10 px',
       'boss': '2× 縮小認得主特徵、不像現有王怪；放 mumi 挑圖 Page', 'slot': '單色 50% 墊 inset 在 24／32 分得出 11 種'}


def preview(j, posts):
    if j['post'] in ('face_shift', 'wall_shift'):
        return d1.preview(j, posts)
    p = posts[0].convert('RGBA')
    w = p.width
    if w >= 48:
        return p
    out = Image.new('RGBA', (w + 2 + 2 * w, 2 * w))
    out.paste(p, (0, w // 2))
    out.paste(p.resize((2 * w, 2 * w), Image.NEAREST), (w + 2, 0))
    return out


def contact(rows_, scale):
    pad, lab_h = 4, 12
    cell = max([64] + [im.width for _, ims in rows_ for _, im in ims])
    cellh = max([64] + [im.height for _, ims in rows_ for _, im in ims])
    ncol = max(len(ims) for _, ims in rows_)
    W = pad + ncol * (cell + pad)
    H = sum(cellh + pad + lab_h for _ in rows_) + pad
    bg = Image.new('RGBA', (W, H), (0x16, 0x13, 0x0f, 255))
    dr = ImageDraw.Draw(bg)
    y = pad
    for jid, ims in rows_:
        dr.text((pad, y), jid, fill=(174, 171, 167, 255))
        y += lab_h
        for k, (seed, im) in enumerate(ims):
            x = pad + k * (cell + pad)
            dr.rectangle([x, y, x + cell - 1, y + cellh - 1], fill=(0x46, 0x41, 0x3c, 255))
            bg.alpha_composite(im, (x + (cell - im.width) // 2, y + (cellh - im.height) // 2))
            dr.text((x + 1, y + cellh - 10), str(seed), fill=(251, 249, 246, 255))
        y += cellh + pad
    return bg.resize((W * scale, H * scale), Image.NEAREST) if scale > 1 else bg


def report(k):
    js = load(k)
    fails = json.loads((OUT / 'failures.json').read_text(encoding='utf-8')) if (OUT / 'failures.json').exists() else []
    fmap = {(f['id'], f['seed']): f"{f['code']} {f['error']}" for f in fails}
    items = []  # (j, seed, stem 量測用, posts)
    for j in js:
        d = OUT / j['id']
        for i in range(j['n']):
            seed = j['seed0'] + i
            st = raw_name(j, seed)
            if not (d / f'{st}.png').exists():
                items.append((j, seed, None, None))
                continue
            ms = f"{stem_of(j, seed)}-{j['shrink']}x{j['shrink']}" if j.get('shrink') else st
            items.append((j, seed, ms, [Image.open(d / 'post' / n) for n in pb.post_names(ms, j['post'])]))
    if k == 2 and (OUT / 'tile_d2_walltop/tile_d2_walltop-s5221-32x32-repost.png').exists():
        j = js[0]
        items.append((j, 5221, 'tile_d2_walltop-s5221-32x32-repost', [Image.open(OUT / 'tile_d2_walltop/post/tile_d2_walltop-s5221-32x32-repost.png')]))
    sils = {}
    for j, seed, ms, posts in items:
        if posts and j['post'] == 'alpha_binary':
            sils.setdefault((j.get('tier'), j['id']), []).append(d1.rgb(posts[0]))
    out, groups, n_ok, n_fail, n_pass = [], {}, 0, 0, 0
    for j, seed, ms, posts in items:
        if ms is None:
            n_fail += 1
            out.append(f"| {k} | `{j['id']}` | {seed} | 失敗 | {fmap.get((j['id'], seed), '沒有圖（未送出）')} | — | — |")
            continue
        n_ok += 'repost' not in ms
        raw = Image.open(OUT / j['id'] / f'{ms}.png')
        if j['id'].startswith('tile'):
            m, ok = measure_wall(j, raw, posts)
            eye = '正上方的面、有石板縫' if 'walltop' in j['id'] else '牆面、無門窗、四種接法無縫'
        else:
            others = [a for (t, i), v in sils.items() if t == j.get('tier') and i != j['id'] for a in v] if j.get('tier') in ('tk', 'tn', 'ts', 'slot') else []
            m, ok = measure_icon(j, raw, posts[0], others)
            eye = EYE.get(j.get('tier'), '1× 可辨' if j['endpoint'].endswith('bitforge') else '道具剪影、無禁用意象')
        n_pass += ok and 'repost' not in ms
        note = f"檔 `{ms}.png`" + ('（首跑原圖、新 post 備案，0 次）' if 'repost' in ms else '') + ('（32 產、縮 16）' if j.get('shrink') else '')
        out.append(f"| {k} | `{j['id']}` | {seed} | 成功 | {note}；" + '；'.join(f'{a} {b}' for a, b in m.items()) + f" | {'✅' if ok else '❌'} | 待美術看：{eye} |")
        groups.setdefault(j['id'], []).append((seed, preview(j, posts)))
    g = list(groups.items())
    if g:
        contact(g, 1).save(OUT / f'contact-{k}-1x.png')
        contact(g, 4).save(OUT / f'contact-{k}-4x.png')
    (OUT / f'results-{k}.md').write_text('\n'.join(out) + '\n', encoding='utf-8')
    summ = {'ok': n_ok, 'fail': n_fail, 'pass': n_pass}
    (OUT / f'summary-{k}.json').write_text(json.dumps(summ), encoding='utf-8')
    print(f'項 {k}：成功 {n_ok}、失敗 {n_fail}、預篩 ✅ {n_pass}／❌ {n_ok - n_pass}')
    merge()


def merge():
    head = ['# M2-36 D2 第二批：自動預篩', '',
            '量測用後處理圖（`post/`），色票偏移、放大圖、禁色用原圖。目視項目一律「待美術看」。小點 32 產、最近鄰縮 16 後量。',
            '- 共用：放大圖（不准）、禁色 `#faaa5e` `#7c5729` `#fa8915`（ΔE≤2，0 像素）、不透明 >5%；16 棋盤 ≤6；原圖 ΔE、主形外框只回報。',
            '- 天賦（tk／tn／ts）：C*>40 ≤25% 不透明；同表他 id 剪影最大 IoU <0.7。部位（slot）：IoU <0.6。王印：C*>40 ≤35%。',
            '- 牆頂：平均 L* 32–38、`#615b56` 55–90%、接縫比 ≤1.2、雜點 ≤2%。牆面每半：平均 L* 17–23、`#33302b`＋`#25211e` ≥85%、第 0 列 `#46413c`、接縫比 ≤1.2。', '']
    body = []
    for k in range(1, 7):
        f = OUT / f'results-{k}.md'
        if not f.exists():
            continue
        s = json.loads((OUT / f'summary-{k}.json').read_text())
        body += [f'## 項 {k} {NAME[k]}', '', f"成功 {s['ok']}、失敗 {s['fail']}；預篩 ✅ {s['pass']}／❌ {s['ok'] - s['pass']}。拼圖 `contact-{k}-1x.png`、`contact-{k}-4x.png`。", '',
                 '| 項 | id | 種子 | 結果 | 量測值 | 預篩 | 目視 |', '| --- | --- | --- | --- | --- | --- | --- |', f.read_text(encoding='utf-8').rstrip(), '']
    (OUT / 'results.md').write_text('\n'.join(head + body) + '\n', encoding='utf-8')


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('cmd', choices=['sheet', 'run', 'report', 'repost5221'])
    p.add_argument('item', nargs='?', type=int)
    p.add_argument('--go', action='store_true')
    p.add_argument('--threads', type=int, default=4)
    a = p.parse_args()
    if a.cmd == 'sheet':
        sheet()
    elif a.cmd == 'run':
        run(a.item, a.go, a.threads)
    elif a.cmd == 'report':
        report(a.item)
    else:
        repost5221()
