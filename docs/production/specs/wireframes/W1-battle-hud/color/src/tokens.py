# D2 定案 token（只用已定的值，不自己發明顏色）。
# 來源：dpoe-docs/docs/production/specs/M2-36-palette-tokens.md、palette-D2-final-ui.md v1.6、palette-D2-panel-1plus.md v1.1。
T = {
 # 場景
 'scene-void':'#16130f','scene-ground':'#46413c','scene-mid':'#33302b','scene-light':'#615b56',
 'scene-lamp-body':'#b98a5e','scene-lamp-glow':'#d9a774',   # glow 用 16%
 # 面板
 'panel-inset':'#1d1a17','panel':'#25211e','panel-edge':'#a8927f','panel-grad-top':'#2d251f','hdr':'#2d251f',
 'panel-raised':'#2c2825','panel-raised-2':'#322f2b',
 'border':'#817b75','border-mid':'#817b75','border-hi':'#b0aaa4','border-cap':'#d9d3cd',
 # 字
 'tx':'#e8e5e1','tx-strong':'#fbf9f6','tx-dim':'#aeaba7','tx-off':'#9d9995','focus':'#fbf9f6',
 # 按鈕與狀態
 'act':'#7c5729','act-edge':'#a8927f','on-act':'#fcf9f3','btn2':'#524c47',
 'sel-bg':'#463a2d','sel-edge':'#a8927f','sel-tx':'#fbf9f6',
 'prog-lo':'#3c3935','prog-hi':'#b6b0a8',
 'hp':'#934341','mp':'#3a5b98','hp-hi':'#af6c64','mp-hi':'#6b7dad',
 # 語意與稀有度
 'good':'#95e886','warn':'#a9ae68','bad':'#ff9bba','bad-hi':'#ff9bba',
 'rar-normal':'#f1ebdb','rar-magic':'#9da7ff','rar-rare':'#fbe53a','rar-rare-frame':'#ccb72e',
 'rar-unique':'#fa8915','rar-chase':'#0cf6ee',
 # 戰場
 'enemy-tel':'#ff3d7f','fx-own':'#c6c6c6','enemy-rim':'#fbbdbb','vig':'#b01a14','hero-ring':'#fbf6ef',
 'dmg-hit':'#e8e5e1','dmg-crit':'#f2cb9b','dmg-hurt':'#fbf9f6','dmg-outline':'#000000',
}
RGBA = {  # 半透明 token
 'plate-world':(37,33,30,int(round(0.92*255))),
 'panel-hi':(255,226,180,int(round(0.12*255))),
 'beam-edge':(0,0,0,int(round(0.8*255))),
 'scrim':(10,7,4,255),
}
def c(name,a=255):
    if name in RGBA: return RGBA[name]
    h=T[name].lstrip('#'); return (int(h[0:2],16),int(h[2:4],16),int(h[4:6],16),a)
RAR={'normal':'rar-normal','magic':'rar-magic','rare':'rar-rare','unique':'rar-unique','chase':'rar-chase'}
