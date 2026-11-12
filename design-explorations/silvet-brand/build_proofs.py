"""Create isolated, self-contained brand proofs. Never imports application code."""
from pathlib import Path
import base64
import html
import itertools
import re
from _font_outline import TrueType

ROOT = Path(__file__).resolve().parent
CHALK, INK, CITRON = "#F4F0E9", "#211A2B", "#D9F36A"
serial = itertools.count()
wordmark_svg = TrueType((ROOT / "assets/instrument-serif.ttf").read_bytes()).wordmark()
(ROOT / "assets/wordmark-outlined.svg").write_text(wordmark_svg)
font = base64.b64encode((ROOT / "assets/geist.ttf").read_bytes()).decode()

DIRECTIONS = [
    ("a-selvedge", "A", "Selvedge", "The finished edge.",
     "A fluid, continuous edge turns the S into a small piece of cloth.",
     "Strongest fabric signature. Inspect whether the parallel edge stays separated at 16px.",
     "The selvedge should feel intentional in one ink, not depend on Citron to exist."),
    ("b-stitched", "B", "Stitched", "A trace of the atelier.",
     "An open S carries a running stitch, like a seam followed by hand.",
     "Most overtly crafted. Individual stitches soften at 16px; the silhouette must carry recognition.",
     "Judge the seam at 24–32px, then check that it does not make the smaller S look broken."),
    ("c-fold", "C", "Fold", "One considered fold.",
     "A restrained crease makes the S feel cut and folded rather than typeset.",
     "The most reduced construction. Inspect S recognition before appreciating the fold detail.",
     "A fold that reads as a numeral or abstract ribbon would need refinement before selection."),
]


def symbol(direction, size, mode="ink"):
    svg = (ROOT / direction / "mark.svg").read_text()
    prefix = f"m{next(serial)}-"
    for identifier in re.findall(r'\bid="([^"]+)"', svg):
        svg = svg.replace(f'id="{identifier}"', f'id="{prefix}{identifier}"')
        svg = svg.replace(f'url(#{identifier})', f'url(#{prefix}{identifier})')
    svg = re.sub(r"<svg\b[^>]*>", f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" '
                 f'width="{size}" height="{size}" class="symbol {mode}" role="img" '
                 f'aria-label="SILVET {direction[2:]} symbol">', svg, count=1)
    return svg


def wordmark(height):
    return wordmark_svg.replace("<svg ", f'<svg class="wordmark" style="height:{height}px" ', 1)


def lockup(direction, size=48, cap=32, mode="ink"):
    return f'<div class="lockup" style="gap:{size/3:g}px">{symbol(direction,size,mode)}{wordmark(cap)}</div>'


def size_row(direction, mode):
    cells = []
    for size in (16, 24, 32):
        cells.append(f'<div class="size-cell"><div class="sample">{symbol(direction,size,mode)}</div><span>{size}px</span></div>')
    cells.append(f'<div class="size-cell"><div class="sample"><div class="tap-target">{symbol(direction,32,mode)}</div></div><span>Nav · 32px / 44px target</span></div>')
    return '<div class="size-row">' + "".join(cells) + "</div>"


def proof(direction):
    folder, letter, title, line, summary, tradeoff, inspect = direction
    return f'''<article class="proof" id="{folder}">
      <header class="proof-heading"><span class="direction-label">{letter} / SILVET IDENTITY STUDY</span><h2>{title}</h2><p>{line}</p></header>
      <div class="hero-pair">
        <div class="hero light">{symbol(folder,104)}{wordmark(25)}<span>Warm Chalk / Midnight</span></div>
        <div class="hero dark">{symbol(folder,104,"signature")}{wordmark(25)}<span>Midnight / Chalk + Citron edge</span></div>
      </div>
      <section class="size-lab"><div class="section-title">Actual CSS sizes · inspect at 100%</div>
        <div class="light size-surface">{size_row(folder,"ink")}</div>
        <div class="dark size-surface">{size_row(folder,"signature")}</div>
      </section>
      <section class="lockup-proof light"><div class="section-title">Desktop lockup · 48px symbol / 32px wordmark height</div>{lockup(folder)}</section>
      <section class="lockup-proof dark"><div class="section-title">Inverse lockup · signature colourway</div>{lockup(folder,48,32,"signature")}</section>
      <section class="mono"><div class="section-title">True one-ink versions · same geometry</div>
        <div class="mono-pair"><div class="light">{lockup(folder,32,21)}<span>Midnight ink on Chalk</span></div><div class="dark">{lockup(folder,32,21)}<span>Chalk ink on Midnight · no Citron</span></div></div>
      </section>
      <section class="responsive"><div class="section-title">Responsive identity · proposed, not installed</div>
        <div class="nav-proof"><span class="nav-caption">Phone &lt;640px · symbol only</span><div class="nav light">{symbol(folder,32)}<span class="nav-text">Wardrobe</span><span class="nav-action">Menu</span></div></div>
        <div class="nav-proof"><span class="nav-caption">Tablet 640–1023px · ample container</span><div class="nav light">{lockup(folder,32,22)}<span class="nav-action">Menu</span></div></div>
        <div class="nav-proof"><span class="nav-caption">Tablet · constrained container</span><div class="nav light compact">{symbol(folder,32)}<span class="nav-action">Menu</span></div></div>
        <div class="nav-proof"><span class="nav-caption">Desktop ≥1024px · complete wordmark</span><div class="nav dark">{lockup(folder,40,27,"signature")}<span class="nav-action">Studio</span></div></div>
      </section>
      <footer class="inspection"><h3>What to look for</h3><p>{summary}</p><p>{tradeoff}</p><p>{inspect}</p></footer>
    </article>'''


CSS = '''
*{box-sizing:border-box}html{background:#F4F0E9;color:#211A2B}
body{margin:0;font-family:Geist,Arial,sans-serif;font-size:14px;line-height:1.5}
.page{max-width:1880px;margin:auto;padding:40px}
.page-header{display:flex;justify-content:space-between;gap:40px;border-bottom:1px solid #211A2B30;padding-bottom:28px;margin-bottom:32px}
.page-header h1{font-size:28px;font-weight:400;line-height:1.2;margin:0 0 10px}
.page-header p{max-width:640px;color:#5E5866;margin:0;font-size:13px}
.scope{max-width:240px;font-size:12px;color:#5E5866}
.proofs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px}
.proof{min-width:0}.proof-heading{min-height:135px}.direction-label{font-size:10px;letter-spacing:.14em}
.proof-heading h2{font-weight:400;font-size:35px;line-height:1;margin:12px 0 8px}
.proof-heading p{font-size:14px;margin:0;color:#5E5866}
.light{background:#F4F0E9;color:#211A2B;--detail:#211A2B}
.dark{background:#211A2B;color:#F4F0E9;--detail:#D9F36A}
.symbol{display:block;flex-shrink:0;overflow:visible;fill:none}
.symbol.signature [data-role="detail"]{color:var(--detail)}
.wordmark{display:block;width:auto;max-width:100%;flex-shrink:0;overflow:visible}
.lockup{display:flex;align-items:center;max-width:100%;flex-shrink:0}
.hero-pair{display:grid;grid-template-columns:1fr 1fr;border:1px solid #211A2B20}
.hero{height:235px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:15px;padding:20px 8px}
.hero span,.mono-pair span{font-size:10px;display:block;margin-top:8px}
.hero.dark span,.mono-pair .dark span{color:#B3ACB9}
.section-title{font-size:10px;letter-spacing:.035em;margin-bottom:12px}
.size-lab{margin-top:25px}.size-surface{padding:14px 12px;border:1px solid #211A2B20}
.size-row{display:grid;grid-template-columns:.65fr .65fr .65fr 1.4fr;gap:8px;align-items:end}
.size-cell{text-align:center;min-width:0}.size-cell .sample{height:52px;display:flex;align-items:center;justify-content:center}
.size-cell span{font-size:10px;white-space:nowrap}.tap-target{width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:1px dashed currentColor;border-radius:2px}
.lockup-proof{border:1px solid #211A2B20;padding:22px;margin-top:20px;min-height:120px}
.lockup-proof.dark .section-title{color:#B3ACB9}.mono{margin-top:25px}
.mono-pair{display:grid;grid-template-columns:1fr 1fr;border:1px solid #211A2B20}
.mono-pair>div{min-height:118px;padding:20px 12px;display:flex;flex-direction:column;justify-content:center;align-items:center}
.responsive{margin-top:25px}.nav-proof{margin-top:13px}.nav-caption{display:block;font-size:10px;margin-bottom:6px;color:#5E5866}
.nav{display:flex;align-items:center;gap:16px;min-height:64px;padding:10px 16px;border:1px solid #211A2B30}
.nav-action{margin-left:auto;font-size:12px}.nav-text{font-size:13px}.nav.compact{max-width:170px}
.inspection{border-top:1px solid #211A2B30;margin-top:25px;padding-top:15px}
.inspection h3{font-size:13px;font-weight:500;margin:0 0 8px}.inspection p{font-size:12px;color:#5E5866;margin:7px 0}
.page-footer{border-top:1px solid #211A2B30;margin-top:32px;padding-top:20px;font-size:12px;color:#5E5866;max-width:960px}
.single .page{max-width:880px}.single .proofs{display:block}.single .page-header{padding-bottom:16px;margin-bottom:22px}
.single .proof-heading{min-height:105px}.single .hero{height:210px}.single .size-lab{margin-top:18px}
.single .responsive{display:grid;grid-template-columns:1fr 1fr;gap:0 20px}
.single .responsive>.section-title{grid-column:1/-1;margin-bottom:0}
.single .inspection{display:grid;grid-template-columns:1fr 1fr;gap:0 24px}
.single .inspection h3{grid-column:1/-1}
@media(max-width:1120px){.proofs{grid-template-columns:1fr}.page{max-width:880px;padding:24px}.proof-heading{min-height:100px}.hero{height:210px}.proofs{gap:50px}}
@media(max-width:580px){.page{padding:20px}.page-header{display:block}.scope{margin-top:14px;max-width:none}.single .responsive,.single .inspection{display:block}.hero{height:190px}.mono-pair{grid-template-columns:1fr}.lockup-proof{padding:18px}.proof-heading h2{font-size:30px}}
'''
CSS = '@font-face{font-family:Geist;src:url(data:font/ttf;base64,' + font + ') format("truetype");font-display:block}' + CSS


def document(body, single=False):
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<link rel="icon" href="data:,">'
            '<title>SILVET — Selvedge identity exploration</title><style>'
            + CSS + '</style></head><body class="' + ("single" if single else "comparison") + '">'
            + body + '</body></html>')


def page(directions, single=False):
    heading = '''<header class="page-header"><div><h1>SILVET / Responsive identity</h1><p>Three fabric constructions. One Instrument Serif wordmark. All marks are bespoke SVG paths; the wordmark is outlined from the existing typeface with optically adjusted spacing.</p></div><div class="scope">DESIGN EXPLORATION ONLY<br>No app, favicon, route or authentication changes. No direction is approved for implementation.</div></header>'''
    footer = '''<footer class="page-footer">Review at 100% for the 16px test; enlarging the sheet also enlarges the specimens. Mobile navigation is shown as a 32px symbol inside a 44px target. Tablet switches according to available space. Citron appears only on Midnight; true one-ink specimens omit it. These are design proofs, not an installed responsive component.</footer>'''
    return document('<main class="page">' + heading + '<div class="proofs">' +
                    "".join(proof(d) for d in directions) + '</div>' + footer + '</main>', single)


(ROOT / "comparison.html").write_text(page(DIRECTIONS))
for direction in DIRECTIONS:
    folder = ROOT / direction[0]
    (folder / "proof.html").write_text(page([direction], True))
    master = (folder / "mark.svg").read_text()
    for name, ink, detail in [("chalk", INK, INK), ("inverse", CHALK, CITRON),
                              ("monochrome", INK, INK), ("inverse-monochrome", CHALK, CHALK)]:
        styled = master.replace("<svg ", f'<svg style="color:{ink}" ', 1)
        styled = styled.replace(">", f'><style>[data-role="detail"]{{color:{detail}}}</style>', 1)
        (folder / f"mark-{name}.svg").write_text(styled)
print("Built comparison, three detailed proof sheets, outlined wordmark and four colourways per direction.")
