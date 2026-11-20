#!/bin/bash
# 用法：S=<scratch> ./mkvariant.sh <名字> [ENV=值 ...]
# 建輕量副本（js、css、tools 真的複製，其餘 symlink 回 repo），套 bakefix＋patch_variant，SEED 有給就換烘焙種子，然後重烘
set -e
name=$1; shift
d="$S/$name"; mkdir -p "$d"
for f in /home/user/dpoe/* /home/user/dpoe/.[a-z]*; do b=$(basename "$f"); case "$b" in js|css|tools|evidence|.git) ;; *) ln -sfn "$f" "$d/$b";; esac; done
cp -r /home/user/dpoe/js /home/user/dpoe/css /home/user/dpoe/tools "$d/"
env "$@" node patch_bakefix.js "$d" >/dev/null
env "$@" node patch_variant.js "$d" ${VARIANT:-entry+xb} >/dev/null
for kv in "$@"; do case "$kv" in SEED=*) sed -i "s/rng(20261106)/rng(${kv#SEED=})/" "$d/tools/tree_bake.js";; esac; done
(cd "$d" && node tools/tree_bake.js | tail -1)
