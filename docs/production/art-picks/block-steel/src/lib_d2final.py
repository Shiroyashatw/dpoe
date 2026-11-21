import numpy as np, colour
def hx(h): h=h.lstrip('#'); return np.array([int(h[i:i+2],16) for i in (0,2,4)])/255.0
def tohex(rgb): rgb=np.clip(np.round(np.array(rgb)*255),0,255).astype(int); return '#%02x%02x%02x'%tuple(rgb)
def lin(c): return colour.models.eotf_sRGB(c)
def Y(h): return float(colour.sRGB_to_XYZ(hx(h))[1])
def cr(a,b):
    ya,yb=Y(a),Y(b); return (max(ya,yb)+.05)/(min(ya,yb)+.05)
def lab(h): return colour.XYZ_to_Lab(colour.sRGB_to_XYZ(hx(h) if isinstance(h,str) else h))
def lch(h): return colour.Lab_to_LCHab(lab(h))
def from_lch(L,C,hdeg):
    l=colour.LCHab_to_Lab(np.array([L,C,hdeg])); rgb=colour.XYZ_to_sRGB(colour.Lab_to_XYZ(l)); return tohex(np.clip(rgb,0,1))
def de(a,b): return float(colour.delta_E(lab(a),lab(b),method='CIE 2000'))
MACH={k:colour.matrix_cvd_Machado2009(k,1.0) for k in ['Protanomaly','Deuteranomaly','Tritanomaly']}
def sim(h,k):
    l=lin(hx(h)); s=np.clip(MACH[k]@l,0,1); return tohex(colour.models.eotf_inverse_sRGB(s))
def decvd(a,b): return {k[:4]:de(sim(a,k),sim(b,k)) for k in MACH}
def mix(fg,bg,a): return tohex(hx(fg)*a+hx(bg)*(1-a))  # sRGB-space alpha blend (canvas default)
