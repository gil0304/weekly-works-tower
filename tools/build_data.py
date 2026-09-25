"""番号付きテーマフォルダ(NN_テーマ名) → 動画・サムネイルの複製と src/works.json の生成。

順番はフォルダの番号、作品の種別は 作品紹介映像/manifest.json、説明文は tools/desc/*.json から取る。
"""
import json, os, re, glob, struct, shutil, subprocess, unicodedata
NFC = lambda t: unicodedata.normalize('NFC', t)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE = os.path.join(ROOT, "作品塔")
CAP = os.path.join(SITE, "public", "captures")

manifest = json.load(open(os.path.join(ROOT, "作品紹介映像", "manifest.json")))
types = {(NFC(t["dir"]), NFC(w["name"])): w["type"] for t in manifest["themes"] for w in t["works"]}

desc = {}
for p in sorted(glob.glob(os.path.join(SITE, "tools", "desc", "*.json"))):
    for d in json.load(open(p)):
        desc[(NFC(d["theme"]), NFC(d["name"]))] = d

TYPE_LABEL = {"web-vite": "Web", "web-next": "Web", "web-static": "Web", "web-vite-camera": "Web",
              "ios": "iOS", "unity": "Unity", "chrome-ext": "Chrome拡張", "ae": "After Effects",
              "minecraft": "Minecraft"}

def github(theme_dir, name):
    try:
        url = subprocess.check_output(["git", "-C", os.path.join(ROOT, theme_dir, name), "remote", "get-url", "origin"],
                                      stderr=subprocess.DEVNULL, text=True).strip()
    except subprocess.CalledProcessError:
        return None
    return url[:-4] if url.endswith(".git") else url

def png_size(p):
    with open(p, "rb") as f:
        f.read(16); return struct.unpack(">II", f.read(8))

def newer(src, dst):
    return not os.path.exists(dst) or os.path.getmtime(src) > os.path.getmtime(dst)

themes = sorted(d for d in os.listdir(ROOT) if re.match(r"^\d\d_", d) and os.path.isdir(os.path.join(ROOT, d)))
out = {"title": "毎週作品", "themes": []}
missing, copied = [], 0
for d in themes:
    order = int(d[:2]); name = NFC(d[3:])
    caps = os.path.join(ROOT, d, "Captures")
    dst_dir = os.path.join(CAP, f"{order:02d}")
    os.makedirs(dst_dir, exist_ok=True)
    works = sorted(w for w in os.listdir(os.path.join(ROOT, d)) if w != "Captures" and not w.startswith(".") and os.path.isdir(os.path.join(ROOT, d, w)))
    theme = {"order": order, "dir": name, "works": []}
    for w in works:
        mp4, png = os.path.join(caps, f"{w}.mp4"), os.path.join(caps, f"{w}.png")
        if not (os.path.exists(mp4) and os.path.exists(png)):
            missing.append(f"{d}/{w} (capture)"); continue
        if newer(mp4, os.path.join(dst_dir, f"{w}.mp4")):
            shutil.copy2(mp4, os.path.join(dst_dir, f"{w}.mp4")); copied += 1
        jpg = os.path.join(dst_dir, f"{w}.jpg")
        if newer(png, jpg):
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", png, "-vf", "scale='min(640,iw)':-2", "-q:v", "4", jpg], check=True)
        wd, ht = png_size(png)
        dd = desc.get((name, NFC(w))) or {}
        if not dd: missing.append(f"{d}/{w} (desc)")
        typ = types.get((name, NFC(w)), "web-static")
        theme["works"].append({
            "name": NFC(w), "type": typ, "kind": TYPE_LABEL.get(typ, typ), "w": wd, "h": ht,
            "tagline": dd.get("tagline", ""), "desc": dd.get("desc", ""), "tech": dd.get("tech", []),
            "url": dd.get("url"), "github": github(d, w),
            "video": f"captures/{order:02d}/{w}.mp4", "thumb": f"captures/{order:02d}/{w}.jpg",
        })
    out["themes"].append(theme)

# 使われなくなった複製を消す
keep = {f"{t['order']:02d}" for t in out["themes"]}
for d in os.listdir(CAP):
    if os.path.isdir(os.path.join(CAP, d)) and d not in keep:
        shutil.rmtree(os.path.join(CAP, d))

json.dump(out, open(os.path.join(SITE, "src", "works.json"), "w"), ensure_ascii=False, indent=1)
n = sum(len(t["works"]) for t in out["themes"])
print(f"works.json: {len(out['themes'])} themes, {n} works; copied {copied} videos; missing: {len(missing)}")
for m in missing: print("  -", m)
for t in out["themes"]: print(f"  {t['order']:02d} {t['dir']}: {', '.join(w['name'] for w in t['works'])}")
