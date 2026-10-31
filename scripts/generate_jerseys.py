"""Draws the AJI TL3AB team jersey collection as SVGs in public/merch/.

Studio look: jersey suspended by steel cables with carabiners, spotlit on a
coloured backdrop. One jersey per team from lib/teams.ts, each with its own
colours, pattern and emblem, plus the AJI TL3AB logo.

Run from the repo root:  python3 scripts/generate_jerseys.py
Edit TEAMS below to change colours or patterns, then run it again.
"""

import base64
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "merch"
LOGO = base64.b64encode((ROOT / "public" / "logo-mark.png").read_bytes()).decode()

# c1/c2: shirt colours · trim: collar & cuffs · accent: badge & sponsor ·
# ink: dark colour behind the emblem and for the sponsor text ·
# bg: backdrop · pattern: stripes | pinstripe | hoops | sash | halves | chevron | fade
TEAMS = [
    dict(slug="vikings", ink="#0E1626", name="Vikings", emblem="helmet", pattern="stripes", c1="#1B2A4A", c2="#5B8FD0", trim="#0E1626", accent="#DCE9F5", bg="#1E4FB8"),
    dict(slug="conquerants", ink="#3A0A12", name="Conquérants", emblem="swords", pattern="sash", c1="#8E1B2E", c2="#D9A93A", trim="#3A0A12", accent="#F3D27A", bg="#7A1222"),
    dict(slug="fighters", ink="#141714", name="Fighters", emblem="shield", pattern="pinstripe", c1="#141714", c2="#C7F36B", trim="#C7F36B", accent="#C7F36B", bg="#1E4D35"),
    dict(slug="lions", ink="#5A0E12", name="Lions de l'Atlas", emblem="paw", pattern="halves", c1="#C1272D", c2="#006233", trim="#F2C14E", accent="#F2C14E", bg="#0D5A35"),
    dict(slug="requins", ink="#071A30", name="Requins", emblem="fin", pattern="hoops", c1="#0B2545", c2="#13A0AE", trim="#071A30", accent="#BFF3F7", bg="#0B6E7A"),
    dict(slug="dragons", ink="#1A1A1A", name="Dragons", emblem="flame", pattern="chevron", c1="#1A1A1A", c2="#F06A1D", trim="#F06A1D", accent="#FFB070", bg="#8A2A06"),
    dict(slug="eclairs", ink="#26144A", name="Éclairs", emblem="bolt", pattern="stripes", c1="#3E2470", c2="#F5C518", trim="#26144A", accent="#F5C518", bg="#4A2A95"),
    dict(slug="titans", ink="#1E2126", name="Titans", emblem="hammer", pattern="fade", c1="#3D424A", c2="#C3C9D1", trim="#1E2126", accent="#E6EAEE", bg="#3A4250"),
]

W = H = 800
JERSEY = (
    "M318 226 L352 212 Q400 246 448 212 L482 226 L572 290 L534 372 L496 348 "
    "L496 640 Q400 652 304 640 L304 348 L266 372 L228 290 Z"
)


def pattern(t):
    c1, c2 = t["c1"], t["c2"]
    p = t["pattern"]
    out = [f'<rect x="200" y="190" width="400" height="480" fill="{c1}"/>']
    if p == "stripes":
        out += [f'<rect x="{x}" y="190" width="34" height="480" fill="{c2}"/>' for x in range(234, 600, 68)]
    elif p == "pinstripe":
        out += [f'<rect x="{x}" y="190" width="5" height="480" fill="{c2}" opacity="0.9"/>' for x in range(222, 600, 30)]
    elif p == "hoops":
        out += [f'<rect x="200" y="{y}" width="400" height="38" fill="{c2}"/>' for y in range(250, 670, 76)]
    elif p == "sash":
        out.append(f'<polygon points="300,190 380,190 600,560 600,660 540,660" fill="{c2}"/>')
        out.append(f'<polygon points="292,190 300,190 540,660 528,660" fill="#FFFFFF" opacity="0.35"/>')
    elif p == "halves":
        out.append(f'<rect x="400" y="190" width="200" height="480" fill="{c2}"/>')
        out.append('<rect x="397" y="190" width="6" height="480" fill="#F2C14E"/>')
    elif p == "chevron":
        for i, y in enumerate((300, 380, 460)):
            op = 1 - i * 0.25
            out.append(f'<polygon points="200,{y} 400,{y + 70} 600,{y} 600,{y + 34} 400,{y + 104} 200,{y + 34}" fill="{c2}" opacity="{op}"/>')
    elif p == "fade":
        out[0] = '<rect x="200" y="190" width="400" height="480" fill="url(#fade)"/>'
        out += [f'<rect x="{x}" y="190" width="3" height="480" fill="#FFFFFF" opacity="0.18"/>' for x in range(226, 600, 26)]
    return "\n".join(out)


EMBLEMS = {
    "helmet": lambda a, b: f"""<g fill="{a}"><path d="M14 30a10 10 0 0 1 20 0z"/><rect x="13" y="29.5" width="22" height="4" rx="1.5"/>
      <rect x="22.5" y="29.5" width="3" height="8" rx="1.5"/><path d="M15 25c-5-1-7-7-5-13 2 5 4 7 8 8z"/><path d="M33 25c5-1 7-7 5-13-2 5-4 7-8 8z"/></g>""",
    "swords": lambda a, b: f"""<g stroke="{a}" stroke-linecap="round" fill="none"><path d="M15 33L34 14M33 33L14 14" stroke-width="3.4"/>
      <path d="M11.5 29.5l7 7M29.5 36.5l7-7" stroke-width="3.2"/><path d="M15 33l-4 4M33 33l4 4" stroke-width="3.2"/></g>""",
    "shield": lambda a, b: f"""<path d="M24 9l12 4.5v9.5c0 7.5-5 13-12 16-7-3-12-8.5-12-16v-9.5z" fill="{a}"/>
      <path d="M24 16.5l2 4.6 5 .4-3.8 3.3 1.2 4.9-4.4-2.7-4.4 2.7 1.2-4.9-3.8-3.3 5-.4z" fill="{b}"/>""",
    "paw": lambda a, b: f"""<g fill="{a}"><ellipse cx="24" cy="30" rx="8" ry="6.5"/><circle cx="14.5" cy="21.5" r="3.4"/>
      <circle cx="20" cy="15.5" r="3.4"/><circle cx="28" cy="15.5" r="3.4"/><circle cx="33.5" cy="21.5" r="3.4"/></g>""",
    "fin": lambda a, b: f"""<path d="M12 31c7-1 12-7 14-19 3 9 6 15 10 19z" fill="{a}"/>
      <path d="M10 36c2.5-2.5 5-2.5 7 0s4.5 2.5 7 0 4.5-2.5 7 0 4.5 2.5 7 0" stroke="{a}" stroke-width="2.6" stroke-linecap="round" fill="none"/>""",
    "flame": lambda a, b: f"""<path d="M24 8c3 7 11 11 11 21a11 11 0 0 1-22 0c0-5 3-8 5-12 1 4 3 6 5 6-2-5-1-10 1-15z" fill="{a}"/>
      <path d="M24 26c1.5 3 5 4.5 5 8a5 5 0 0 1-10 0c0-2.5 2-4 5-8z" fill="{b}"/>""",
    "bolt": lambda a, b: f'<path d="M27 7L13 27h9.5L19 41l16-21h-10z" fill="{a}"/>',
    "hammer": lambda a, b: f"""<g fill="{a}"><rect x="12" y="11" width="24" height="10" rx="2.5"/><rect x="21.5" y="20" width="5" height="19" rx="2"/>
      <rect x="19" y="36" width="10" height="4" rx="2"/></g>""",
}

# (point on the jersey, point on the canvas edge)
CABLES = [((326, 222), (150, -10)), ((474, 222), (650, -10)), ((234, 296), (-10, 240)),
          ((566, 296), (810, 240)), ((310, 634), (120, 810)), ((490, 634), (680, 810))]


def cable(j, e):
    (x1, y1), (x2, y2) = j, e
    ang = math.degrees(math.atan2(y2 - y1, x2 - x1))
    # carabiner ~34px out from the jersey
    d = 34
    cx, cy = x1 + d * math.cos(math.radians(ang)), y1 + d * math.sin(math.radians(ang))
    return f"""
  <line x1="{cx:.1f}" y1="{cy:.1f}" x2="{x2}" y2="{y2}" stroke="#9AA3AD" stroke-width="3.5"/>
  <line x1="{cx:.1f}" y1="{cy:.1f}" x2="{x2}" y2="{y2}" stroke="#F4F7FA" stroke-width="1.2" opacity="0.8"/>
  <g transform="translate({cx:.1f} {cy:.1f}) rotate({ang:.1f})">
    <rect x="-22" y="-6" width="30" height="12" rx="6" fill="none" stroke="#DDE3E8" stroke-width="3.2"/>
    <rect x="-22" y="-6" width="30" height="12" rx="6" fill="none" stroke="#6E7781" stroke-width="1" opacity="0.6"/>
    <line x1="2" y1="-6" x2="2" y2="6" stroke="#DDE3E8" stroke-width="2.4"/>
  </g>
  <circle cx="{x1}" cy="{y1}" r="5" fill="none" stroke="#DDE3E8" stroke-width="3"/>"""


def jersey_svg(t):
    emblem = EMBLEMS[t["emblem"]](t["accent"], t["ink"])
    cables = "".join(cable(j, e) for j, e in CABLES)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {W} {H}">
  <title>Maillot {t['name']} · AJI TL3AB</title>
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="70%">
      <stop offset="0" stop-color="{t['bg']}"/>
      <stop offset="0.55" stop-color="{t['bg']}" stop-opacity="0.75"/>
      <stop offset="1" stop-color="#05070C"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{t['c1']}"/><stop offset="1" stop-color="{t['c2']}"/>
    </linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#000" stop-opacity="0.45"/>
      <stop offset="0.3" stop-color="#FFF" stop-opacity="0.10"/>
      <stop offset="0.55" stop-color="#FFF" stop-opacity="0.04"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.5"/>
    </linearGradient>
    <linearGradient id="shadeV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFF" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.35"/>
    </linearGradient>
    <clipPath id="shirt"><path d="{JERSEY}"/></clipPath>
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>
  </defs>

  <rect width="{W}" height="{H}" fill="#05070C"/>
  <rect width="{W}" height="{H}" fill="url(#bg)"/>
  <ellipse cx="400" cy="420" rx="250" ry="260" fill="#FFFFFF" opacity="0.10" filter="url(#blur)"/>
  {cables}
  <path d="{JERSEY}" transform="translate(10 18)" fill="#000" opacity="0.45" filter="url(#blur)"/>

  <g clip-path="url(#shirt)">
    {pattern(t)}
    <line x1="228" y1="290" x2="266" y2="372" stroke="{t['trim']}" stroke-width="22"/>
    <line x1="572" y1="290" x2="534" y2="372" stroke="{t['trim']}" stroke-width="22"/>
    <path d="M320 430 C360 470 330 560 350 640 M470 380 C440 450 480 540 455 640 M304 360 C330 380 330 420 312 470"
          stroke="#FFF" stroke-opacity="0.07" stroke-width="10" fill="none"/>
    <rect x="200" y="190" width="400" height="480" fill="url(#shade)"/>
    <rect x="200" y="190" width="400" height="480" fill="url(#shadeV)"/>
  </g>

  <path d="M352 212 Q400 246 448 212" stroke="{t['trim']}" stroke-width="11" fill="none" stroke-linecap="round"/>
  <path d="M358 216 L400 258 L442 216 Q400 238 358 216 Z" fill="{t['trim']}"/>

  <image x="318" y="286" width="58" height="43" xlink:href="data:image/png;base64,{LOGO}" href="data:image/png;base64,{LOGO}"/>

  <g transform="translate(428 280) scale(1.15)">
    <path d="M6 4 h44 v30 c0 12 -12 20 -22 24 c-10 -4 -22 -12 -22 -24 z" fill="{t['ink']}" stroke="{t['accent']}" stroke-width="2.5"/>
    <g transform="translate(9 4) scale(0.8)">{emblem}</g>
  </g>

  <rect x="328" y="398" width="144" height="52" rx="26" fill="{t['accent']}"/>
  <text x="400" y="434" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif"
        font-weight="900" font-size="28" letter-spacing="1" fill="{t['ink']}">TL3AB</text>
</svg>
"""


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for t in TEAMS:
        path = OUT / f"maillot-{t['slug']}.svg"
        path.write_text(jersey_svg(t), encoding="utf-8")
        print("wrote", path.relative_to(ROOT))


if __name__ == "__main__":
    main()
