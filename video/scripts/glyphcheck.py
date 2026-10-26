import sys, io
from fontTools.ttLib import TTFont
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
text = open(sys.argv[1], encoding='utf-8').read()
for fn in ('noto-serif-sc-600','noto-serif-sc-500','noto-sans-sc-500'):
    cmap = TTFont(f'public/fonts/{fn}.woff2').getBestCmap()
    miss = ''.join(c for c in sorted(set(text)) if not c.isspace() and ord(c) not in cmap and ord(c) > 127)
    print(fn, 'missing:', miss)
