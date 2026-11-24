"""Builds docs/report/Zubia_Junaid_Portfolio_Report.pdf from docs/report/report.html.

Pass 1 prints the report to find the page of every heading and caption (from the PDF bookmarks),
pass 2 prints it again with the contents, figures and tables lists filled in. Then the running
header and page numbers are stamped on every page except the cover.
Run from the project root:  python scripts/build_report.py   (needs PyMuPDF and Microsoft Edge)
"""
import html as H
import os
import re
import subprocess

import pymupdf

SRC = 'docs/report/report.html'
TMP_HTML = 'docs/report/_build.html'
TMP_PDF = 'docs/report/_build.pdf'
OUT = 'docs/report/Zubia_Junaid_Portfolio_Report.pdf'
HEADER = "Zubia's Studio - Interactive 3D Web Portfolio  |  Web 3D Programming (CT-409)"

src = open(SRC, encoding='utf8').read()
items = []  # (kind, id, text)
for m in re.finditer(r'<(h2|h3|h6)(?: class="(\w+)")? id="([\w-]+)">(.*?)</\1>', src, re.S):
    tag, cls, hid, text = m.groups()
    text = H.unescape(re.sub(r'<[^>]+>', '', text)).strip()
    if tag == 'h6':
        kind = 'tab' if cls == 'tab' else 'fig'
    else:
        kind = tag
    items.append((kind, hid, text))


def lists(pages):
    def row(cls, text, n):
        return f'<div class="{cls}"><span class="t">{H.escape(text)}</span><span class="dots"></span><span class="n">{n}</span></div>'
    toc = ''.join(row('l2' if k == 'h2' else 'l3', t, pages.get(t, '00')) for k, _, t in items if k in ('h2', 'h3'))
    lof = ''.join(row('l2', t, pages.get(t, '00')) for k, _, t in items if k == 'fig')
    lot = ''.join(row('l2', t, pages.get(t, '00')) for k, _, t in items if k == 'tab')
    return src.replace('<!--TOC-->', toc).replace('<!--LOF-->', lof).replace('<!--LOT-->', lot)


def render(pages):
    open(TMP_HTML, 'w', encoding='utf8').write(lists(pages))
    subprocess.run(['node', 'scripts/report-pdf.mjs', TMP_HTML, TMP_PDF], check=True)
    doc = pymupdf.open(stream=open(TMP_PDF, 'rb').read(), filetype='pdf')
    found = {}
    norm = lambda s: re.sub(r'\s+', ' ', s).strip()
    for _, title, page in doc.get_toc():
        found.setdefault(norm(title), page)
    def page_of(t):
        t = norm(t)
        if t in found:
            return found[t]
        key = t.split(':')[0] + ':' if re.match(r'^(Figure|Table) \d+:', t) else None
        for title, pg in found.items():  # long captions can be shortened in the bookmarks
            if (key and title.startswith(key)) or t.startswith(title[:40]):
                return pg
        return '?'
    return doc, {t: page_of(t) for _, _, t in items}


_, pages = render({})
doc, pages2 = render(pages)
assert pages == pages2, 'page numbers moved between passes'
missing = [t for t, p in pages.items() if p == '?']
print('missing:', missing)

# running header and page numbers (not on the cover)
for i, page in enumerate(doc):
    if i == 0:
        continue
    w, h = page.rect.width, page.rect.height
    page.insert_textbox(pymupdf.Rect(60, 34, w - 60, 50), HEADER, fontname='Times-Italic', fontsize=8.5, color=(0, 0, 0), align=pymupdf.TEXT_ALIGN_CENTER)
    page.draw_line(pymupdf.Point(68, 50), pymupdf.Point(w - 68, 50), color=(0, 0, 0), width=0.4)
    page.insert_textbox(pymupdf.Rect(0, h - 40, w, h - 24), str(i + 1), fontname='Times-Roman', fontsize=10.5, align=pymupdf.TEXT_ALIGN_CENTER)

# bookmarks: real headings only
doc.set_toc([[1 if k == 'h2' else 2, t, pages[t]] for k, _, t in items if k in ('h2', 'h3') and pages[t] != '?'])
doc.set_metadata({'title': 'Interactive 3D Web Portfolio - Project Report', 'author': 'Zubia Junaid', 'subject': 'Web 3D Programming (CT-409)'})
doc.save(OUT, garbage=3, deflate=True)
doc.close()
os.remove(TMP_PDF)
os.remove(TMP_HTML)
print('saved', OUT, pymupdf.open(OUT).page_count, 'pages', os.path.getsize(OUT) // 1024, 'KB')
