import re,json,sys
L={};cur=None
for line in open(sys.argv[1],encoding='utf-8'):
    m=re.match(r'^#+ .*?(01-stats|02-stats-menu|03-pin-edit|04a-cands-hover|04b-cands-hover-alt|07-empty)',line)
    if m: cur=m.group(1); L[cur]=[]; continue
    c=[x.strip() for x in line.split('|')]
    if cur and len(c)>8 and re.match(r'^[A-G]\d\d$',c[1]):
        xy=re.match(r'(\d+),(\d+)',c[3]); wh=re.match(r'(\d+)×(\d+)',c[4])
        if xy and wh: L[cur].append(dict(id=c[1],n=c[2],x=int(xy[1]),y=int(xy[2]),w=int(wh[1]),h=int(wh[2]),font=c[6],note=c[8][:120]))
json.dump(L,open(sys.argv[2],'w'),ensure_ascii=False,indent=0)
print({k:len(v) for k,v in L.items()})
