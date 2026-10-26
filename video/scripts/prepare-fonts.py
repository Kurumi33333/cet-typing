"""Subset + copy the fonts the film actually uses into video/public/fonts/.

Sources:
  - EB Garamond 400/500/italic: the product's own files (public/fonts/, SIL OFL)
  - Noto Serif SC / Noto Sans SC: installed variable fonts, subset to the
    characters that appear on screen (variable -> static at the weights used)
  - Inter 400/500/600: installed TTFs (product CSS uses Inter first)

Run: python scripts/prepare-fonts.py
"""
import json
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
PRODUCT = ROOT.parent
OUT = ROOT / "public" / "fonts"
OUT.mkdir(parents=True, exist_ok=True)

# Every CJK character that appears in the film (copy is frozen in src/copy.ts,
# but the subset is built from a superset so small copy edits do not break it).
CJK = (
    "看中文写英文我每天练习因为你想茶错了就改拼满换下一句四六级中译英基本功"
    "个词一块砖句话全部对跳到目标表达单句返回设置检查答案显示空格方向切换"
    "喜欢水们乘公交车上学英语和朋友一起阅读健康运动计划为明制定这有助于保持"
    "重要认为提高的水水平证据充足结论支持并非完全可靠技术进影响活方式积极"
    "决定优先处理项任务尽管困难克服能够需要帮助时间理解问题准备考试下周场"
    "责任合作共同目标有效沟通促负责每位员都应该对结果保护环境源节约家减少"
    "污染能力教育职业受到良好现功当上教授适做份工作绝对利条件"
    "单元步错的会回来到期复习天数字来自台浏览器里真实记录无账号也没有云端同"
    "进度和错卡都存在设备本不注册断网照样练先打出认识再把们一句从两个短到"
    "十一长音开每次敲击都有声音轻点记得更牢忘记很快写出来慢反而"
    "第一二三四五六七八九十百千零两遍次分钟小时周月年"
)

CJK += "我喜欢茶。她每天练习英语打错的词原位改一个块砖句话看中文，把英文一个词一个词打出来课程结构十二单元百二十步原创练习错的会回来隔得越久要自己想到期复习天后记录只留在这台设备没有账号断网也能继续轻一点记得更牢四六级中译本地优先每一次敲击都有声音键音类各不相同词库随手可查全部拼对立刻进入下一句点哪个词槽都能改不必从左到右不用注册练习词槽四六级她孩希望良好教育课程阶梯"  # v2 copy

# Scan every source file so no glyph can silently fall back to a system font
# (a missing glyph renders in another face and looks like a random bold/thin character).
import re
for _f in list((ROOT / "src").rglob("*.ts")) + list((ROOT / "src").rglob("*.tsx")):
    CJK += "".join(re.findall(r"[　-〿一-鿿＀-￯]", _f.read_text(encoding="utf-8")))

LATIN = (
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    " .,;:!?'\"-_/()[]·—…、。，：；！？（）【】《》「」“”‘’"
    "→←↑↓✓⌨●◇"
)

CHARS = "".join(sorted(set(CJK + LATIN)))
(ROOT / "public" / "fonts" / "chars.txt").write_text(CHARS, encoding="utf-8")


def run(cmd):
    print(" ".join(str(c) for c in cmd))
    res = subprocess.run([str(c) for c in cmd], capture_output=True, text=True)
    if res.returncode != 0:
        sys.exit(res.stderr[-2000:])


def subset_cjk(src: pathlib.Path, out_name: str, weight: int, extra_axes: list[str] = None):
    """Variable TTF -> static instance at `weight`, subset to CHARS, woff2."""
    out = OUT / out_name
    cmd = [
        sys.executable, "-m", "fontTools.varLib.instancer", src,
        f"wght={weight}", "-o", OUT / "_tmp.ttf", "--no-overlap",
    ]
    if extra_axes:
        for ax in extra_axes:
            cmd.insert(-4, ax)
    run(cmd)
    run([
        sys.executable, "-m", "fontTools.subset", OUT / "_tmp.ttf",
        f"--text-file={ROOT / 'public' / 'fonts' / 'chars.txt'}",
        "--layout-features=*", "--flavor=woff2", f"--output-file={out}",
        "--no-hinting", "--desubroutinize",
    ])
    (OUT / "_tmp.ttf").unlink(missing_ok=True)
    print(f"  -> {out.name} {out.stat().st_size / 1024:.0f} KB")


def subset_static(src: pathlib.Path, out_name: str):
    out = OUT / out_name
    run([
        sys.executable, "-m", "fontTools.subset", src,
        f"--text-file={ROOT / 'public' / 'fonts' / 'chars.txt'}",
        "--layout-features=*", "--flavor=woff2", f"--output-file={out}",
        "--no-hinting", "--desubroutinize",
    ])
    print(f"  -> {out.name} {out.stat().st_size / 1024:.0f} KB")


def main():
    fonts = pathlib.Path(r"C:\Windows\Fonts")
    # 1. the product's own Latin serif, verbatim
    for name in ("eb-garamond-400-normal.woff2", "eb-garamond-500-normal.woff2", "eb-garamond-400-italic.woff2"):
        shutil.copy2(PRODUCT / "public" / "fonts" / name, OUT / name)
        print("copy", name)
    shutil.copy2(PRODUCT / "public" / "fonts" / "OFL.txt", OUT / "EB-Garamond-OFL.txt")

    # 2. CJK, subset at the two weights the design spec uses
    print("subset Noto Serif SC")
    subset_cjk(fonts / "NotoSerifSC-VF.ttf", "noto-serif-sc-500.woff2", 500)
    subset_cjk(fonts / "NotoSerifSC-VF.ttf", "noto-serif-sc-600.woff2", 600)
    print("subset Noto Sans SC")
    subset_cjk(fonts / "NotoSansSC-VF.ttf", "noto-sans-sc-400.woff2", 400)
    subset_cjk(fonts / "NotoSansSC-VF.ttf", "noto-sans-sc-500.woff2", 500)
    subset_cjk(fonts / "NotoSansSC-VF.ttf", "noto-sans-sc-700.woff2", 700)

    # 3. Inter statics
    for src, name in (("Inter-Regular.ttf", "inter-400.woff2"),
                      ("Inter-Medium.ttf", "inter-500.woff2"),
                      ("Inter-SemiBold.ttf", "inter-600.woff2")):
        subset_static(fonts / src, name)

    manifest = {
        "chars": len(CHARS),
        "files": sorted(p.name for p in OUT.glob("*.woff2")),
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    print("done", manifest["chars"], "chars")


if __name__ == "__main__":
    main()
