#!/usr/bin/env python3
"""
Trynext Design Studio — Comprehensive Rebuild & Fix Plan
Generated with ReportLab
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether, ListFlowable, ListItem,
)
from reportlab.lib.colors import HexColor

# ── Brand Palette ─────────────────────────────────────────────────────────────
BRAND_BLACK   = HexColor("#0A0A0A")
BRAND_ORANGE  = HexColor("#F97316")
BRAND_AMBER   = HexColor("#FBBF24")
BRAND_TEAL    = HexColor("#0D9488")
BRAND_INDIGO  = HexColor("#4F46E5")
BRAND_RED     = HexColor("#DC2626")
BRAND_GREEN   = HexColor("#16A34A")
LIGHT_GRAY    = HexColor("#F3F4F6")
MID_GRAY      = HexColor("#6B7280")
DARK_GRAY     = HexColor("#1F2937")
WHITE         = HexColor("#FFFFFF")
CARD_BG       = HexColor("#F9FAFB")
CODE_BG       = HexColor("#1E1E2E")

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm


def build_styles():
    base = getSampleStyleSheet()

    styles = {
        "cover_title": ParagraphStyle(
            "cover_title",
            fontName="Helvetica-Bold",
            fontSize=34,
            textColor=WHITE,
            leading=42,
            alignment=TA_CENTER,
            spaceAfter=8,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub",
            fontName="Helvetica",
            fontSize=14,
            textColor=HexColor("#D1D5DB"),
            leading=20,
            alignment=TA_CENTER,
            spaceAfter=4,
        ),
        "cover_tag": ParagraphStyle(
            "cover_tag",
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=BRAND_AMBER,
            leading=16,
            alignment=TA_CENTER,
        ),
        "section_h": ParagraphStyle(
            "section_h",
            fontName="Helvetica-Bold",
            fontSize=20,
            textColor=BRAND_BLACK,
            leading=26,
            spaceBefore=18,
            spaceAfter=10,
            borderPad=4,
        ),
        "sub_h": ParagraphStyle(
            "sub_h",
            fontName="Helvetica-Bold",
            fontSize=14,
            textColor=DARK_GRAY,
            leading=20,
            spaceBefore=12,
            spaceAfter=6,
        ),
        "sub_h2": ParagraphStyle(
            "sub_h2",
            fontName="Helvetica-Bold",
            fontSize=12,
            textColor=BRAND_TEAL,
            leading=16,
            spaceBefore=8,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "body",
            fontName="Helvetica",
            fontSize=10,
            textColor=DARK_GRAY,
            leading=15,
            spaceAfter=5,
            alignment=TA_JUSTIFY,
        ),
        "body_bold": ParagraphStyle(
            "body_bold",
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=DARK_GRAY,
            leading=15,
            spaceAfter=4,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            fontName="Helvetica",
            fontSize=9.5,
            textColor=DARK_GRAY,
            leading=14,
            leftIndent=14,
            spaceAfter=3,
            bulletIndent=4,
        ),
        "code": ParagraphStyle(
            "code",
            fontName="Courier",
            fontSize=8.5,
            textColor=HexColor("#E2E8F0"),
            leading=13,
            spaceAfter=2,
            backColor=CODE_BG,
            leftIndent=8,
            rightIndent=8,
            borderPad=6,
        ),
        "tag": ParagraphStyle(
            "tag",
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=WHITE,
            leading=12,
            alignment=TA_CENTER,
        ),
        "label": ParagraphStyle(
            "label",
            fontName="Helvetica-Bold",
            fontSize=9,
            textColor=MID_GRAY,
            leading=12,
            spaceAfter=2,
        ),
        "caption": ParagraphStyle(
            "caption",
            fontName="Helvetica",
            fontSize=8.5,
            textColor=MID_GRAY,
            leading=12,
            alignment=TA_CENTER,
            spaceAfter=6,
        ),
        "alert_ok": ParagraphStyle(
            "alert_ok",
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=BRAND_GREEN,
            leading=14,
            spaceAfter=4,
        ),
        "alert_warn": ParagraphStyle(
            "alert_warn",
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=BRAND_RED,
            leading=14,
            spaceAfter=4,
        ),
    }
    return styles


def hr(color=BRAND_ORANGE, thickness=1.5):
    return HRFlowable(width="100%", thickness=thickness, color=color, spaceAfter=8, spaceBefore=4)


def section_badge(text, color=BRAND_ORANGE):
    data = [[Paragraph(text, ParagraphStyle("b", fontName="Helvetica-Bold", fontSize=9, textColor=WHITE, alignment=TA_CENTER))]]
    t = Table(data, colWidths=[60 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), color),
        ("ROUNDEDCORNERS", [4]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def info_card(items, bg=CARD_BG, label_color=BRAND_TEAL):
    """Key-value card."""
    s = build_styles()
    rows = []
    for k, v in items:
        rows.append([
            Paragraph(k, ParagraphStyle("kl", fontName="Helvetica-Bold", fontSize=9, textColor=label_color)),
            Paragraph(v, ParagraphStyle("vl", fontName="Helvetica", fontSize=9, textColor=DARK_GRAY, leading=13)),
        ])
    t = Table(rows, colWidths=[50 * mm, 108 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [bg, WHITE]),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, HexColor("#E5E7EB")),
    ]))
    return t


def phase_table(phases):
    s = build_styles()
    header = [
        Paragraph("Phase", ParagraphStyle("ph", fontName="Helvetica-Bold", fontSize=9, textColor=WHITE)),
        Paragraph("Name", ParagraphStyle("ph", fontName="Helvetica-Bold", fontSize=9, textColor=WHITE)),
        Paragraph("Duration", ParagraphStyle("ph", fontName="Helvetica-Bold", fontSize=9, textColor=WHITE)),
        Paragraph("Key Deliverables", ParagraphStyle("ph", fontName="Helvetica-Bold", fontSize=9, textColor=WHITE)),
        Paragraph("Priority", ParagraphStyle("ph", fontName="Helvetica-Bold", fontSize=9, textColor=WHITE)),
    ]
    rows = [header]
    priority_colors = {"CRITICAL": BRAND_RED, "HIGH": BRAND_ORANGE, "MEDIUM": BRAND_TEAL, "LOW": MID_GRAY}
    for ph in phases:
        pc = priority_colors.get(ph[4], MID_GRAY)
        rows.append([
            Paragraph(ph[0], ParagraphStyle("pc", fontName="Helvetica-Bold", fontSize=9, textColor=BRAND_INDIGO)),
            Paragraph(ph[1], ParagraphStyle("pn", fontName="Helvetica-Bold", fontSize=9, textColor=DARK_GRAY)),
            Paragraph(ph[2], ParagraphStyle("pd", fontName="Helvetica", fontSize=9, textColor=MID_GRAY)),
            Paragraph(ph[3], ParagraphStyle("pk", fontName="Helvetica", fontSize=8.5, textColor=DARK_GRAY, leading=13)),
            Paragraph(ph[4], ParagraphStyle("pp", fontName="Helvetica-Bold", fontSize=8, textColor=WHITE, alignment=TA_CENTER)),
        ])

    t = Table(rows, colWidths=[16*mm, 38*mm, 20*mm, 72*mm, 18*mm])
    ts = [
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLACK),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [CARD_BG, WHITE]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]
    for i, ph in enumerate(phases, 1):
        pc = priority_colors.get(ph[4], MID_GRAY)
        ts.append(("BACKGROUND", (4, i), (4, i), pc))
    t.setStyle(TableStyle(ts))
    return t


def code_block(lines, bg=CODE_BG):
    s = build_styles()
    content = "<br/>".join(lines)
    p = Paragraph(content, s["code"])
    data = [[p]]
    t = Table(data, colWidths=[164 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("LINEAFTER", (0, 0), (0, -1), 4, BRAND_ORANGE),
    ]))
    return t


def status_row(label, status, ok=True):
    color = BRAND_GREEN if ok else BRAND_RED
    mark = "✓" if ok else "✗"
    data = [[
        Paragraph(label, ParagraphStyle("sl", fontName="Helvetica", fontSize=9, textColor=DARK_GRAY)),
        Paragraph(f"{mark}  {status}", ParagraphStyle("ss", fontName="Helvetica-Bold", fontSize=9, textColor=color)),
    ]]
    t = Table(data, colWidths=[80*mm, 84*mm])
    t.setStyle(TableStyle([
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
    ]))
    return t


def two_col(left_items, right_items, style):
    """Two-column bullet layout."""
    left_text = "<br/>".join(f"• {i}" for i in left_items)
    right_text = "<br/>".join(f"• {i}" for i in right_items)
    lp = Paragraph(left_text, style)
    rp = Paragraph(right_text, style)
    t = Table([[lp, rp]], colWidths=[82*mm, 82*mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


def feature_table(rows_data, headers):
    s = build_styles()
    header_row = [Paragraph(h, ParagraphStyle("fh", fontName="Helvetica-Bold", fontSize=9, textColor=WHITE)) for h in headers]
    data = [header_row]
    for row in rows_data:
        data.append([Paragraph(str(c), ParagraphStyle("fb", fontName="Helvetica", fontSize=9, textColor=DARK_GRAY, leading=13)) for c in row])

    col_count = len(headers)
    col_w = 164 * mm / col_count
    t = Table(data, colWidths=[col_w] * col_count)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_INDIGO),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [CARD_BG, WHITE]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


# ════════════════════════════════════════════════════════════════════════════
# DOCUMENT BUILD
# ════════════════════════════════════════════════════════════════════════════

def build_pdf(output_path="Trynext_DesignStudio_MasterPlan.pdf"):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title="Trynext Design Studio — Master Rebuild Plan",
        author="Trynext Engineering",
        subject="Design Studio Comprehensive Rebuild Plan 2026",
    )

    s = build_styles()
    story = []

    # ══════════════════════════════════════════════════════
    # COVER PAGE
    # ══════════════════════════════════════════════════════
    cover_data = [[
        Paragraph("Trynext Lifestyle", s["cover_tag"]),
        Spacer(1, 8),
        Paragraph("Design Studio", s["cover_title"]),
        Paragraph("Master Rebuild &amp; Feature Plan", s["cover_title"]),
        Spacer(1, 10),
        Paragraph("Comprehensive Architecture · Advanced Features · Implementation Roadmap", s["cover_sub"]),
        Spacer(1, 6),
        Paragraph("trynext.shop  ·  Version 2.0  ·  July 2026", s["cover_sub"]),
    ]]
    cover_table = Table([[c] for c in cover_data[0]], colWidths=[164*mm])
    cover_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_BLACK),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 20),
        ("RIGHTPADDING", (0, 0), (-1, -1), 20),
    ]))

    # Simpler cover block
    story.append(Spacer(1, 30*mm))
    story.append(Table([
        [Paragraph("TRYNEXT LIFESTYLE", ParagraphStyle("ct0", fontName="Helvetica-Bold", fontSize=11, textColor=BRAND_AMBER, alignment=TA_CENTER))],
        [Paragraph("Design Studio", ParagraphStyle("ct1", fontName="Helvetica-Bold", fontSize=38, textColor=WHITE, alignment=TA_CENTER, leading=46))],
        [Paragraph("Master Rebuild &amp; Feature Plan", ParagraphStyle("ct2", fontName="Helvetica-Bold", fontSize=20, textColor=BRAND_ORANGE, alignment=TA_CENTER, leading=28))],
        [Spacer(1, 6)],
        [Paragraph("Comprehensive Architecture  ·  Advanced Features  ·  Implementation Roadmap  ·  All-in-One Command Guide", ParagraphStyle("ct3", fontName="Helvetica", fontSize=10, textColor=HexColor("#9CA3AF"), alignment=TA_CENTER, leading=15))],
        [Spacer(1, 4)],
        [Paragraph("trynext.shop  ·  Version 2.0  ·  July 2026", ParagraphStyle("ct4", fontName="Helvetica", fontSize=9, textColor=HexColor("#6B7280"), alignment=TA_CENTER))],
    ], colWidths=[164*mm]))
    story[-1].setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_BLACK),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("LEFTPADDING", (0, 0), (-1, -1), 24),
        ("RIGHTPADDING", (0, 0), (-1, -1), 24),
        ("ROUNDEDCORNERS", [8]),
    ]))

    story.append(Spacer(1, 20*mm))

    # TOC summary card
    toc_data = [
        [Paragraph("§", ParagraphStyle("ti", fontName="Helvetica-Bold", fontSize=16, textColor=BRAND_ORANGE, alignment=TA_CENTER)),
         Paragraph("Section", ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=9, textColor=WHITE)),
         Paragraph("Focus", ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=9, textColor=WHITE))],
        ["1", "Emergency Fixes", "Database + admin panel zeros + GitHub token"],
        ["2", "Current State Audit", "Existing codebase analysis and pain points"],
        ["3", "Redesigned Architecture", "Component split, state management, performance"],
        ["4", "New Mockup System", "PSD-quality renders, proper photo compositing"],
        ["5", "Advanced UI Features", "Clipart, gradients, patterns, shapes, effects"],
        ["6", "AI Integration v2", "Stable Diffusion, style transfer, auto-compose"],
        ["7", "Tech Stack Upgrade", "Fabric.js / Konva, Zustand, Cloudflare Workers"],
        ["8", "Mobile Experience", "Touch-native gestures, PWA, Expo deep link"],
        ["9", "Implementation Phases", "6-phase roadmap with timelines"],
        ["10", "All-in-One Command Guide", "Copy-paste ready commands for every task"],
    ]
    toc_table = Table(toc_data, colWidths=[10*mm, 58*mm, 96*mm])
    toc_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLACK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("BACKGROUND", (0, 1), (-1, -1), CARD_BG),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [CARD_BG, WHITE]),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 1), (0, -1), HexColor("#EEF2FF")),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 1), (0, -1), BRAND_INDIGO),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
    ]))
    story.append(toc_table)
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════
    # SECTION 1 — EMERGENCY FIXES (DB / Admin 0s)
    # ══════════════════════════════════════════════════════
    story.append(section_badge("§1  EMERGENCY FIXES  —  Do These First", BRAND_RED))
    story.append(Spacer(1, 4))
    story.append(Paragraph("1.1  Admin Panel Showing 0s — Root Cause &amp; Fix", s["section_h"]))
    story.append(hr(BRAND_RED))

    story.append(Paragraph(
        "The admin dashboard showing zeros for orders, revenue, and customers is caused by a <b>Neon database quota issue</b>. "
        "The primary database (DATABASE_URL_MAIN) exceeded its data-transfer quota and the failover (DATABASE_FAILOVER) "
        "exceeded its compute-time quota. The server automatically fell back to DATABASE_PRODUCTS — a catalog shard "
        "that has products but <b>no order history</b>.",
        s["body"]
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("✅  Fix Applied (Automatic — already deployed)", s["alert_ok"]))
    story.append(Paragraph(
        "The DATABASE_ANALYTICS shard (ep-cool-mountain) was discovered to contain <b>73 real orders, 10 products, "
        "3 reviews, and 613 total rows</b> — a full mirror from the last healthy sync of the main database. "
        "The failover priority in <b>lib/db/src/index.ts</b> has been updated to promote DATABASE_ANALYTICS "
        "above DATABASE_PRODUCTS. The API server has been rebuilt and restarted.",
        s["body"]
    ))
    story.append(Spacer(1, 4))

    story.append(info_card([
        ("Before fix", "Main → Failover [quota] → Products (0 orders) → Analytics"),
        ("After fix", "Main → Failover [quota] → Analytics (73 orders ✓) → Products"),
        ("Orders visible", "73 real orders now showing in admin panel"),
        ("Revenue visible", "Real revenue data now accessible"),
        ("Action needed", "Upgrade Neon plan to restore Main + Failover DBs (monthly reset coming)"),
    ]))
    story.append(Spacer(1, 10))

    story.append(Paragraph("1.2  Neon Database Quota — What To Do", s["sub_h"]))
    story.append(Paragraph(
        "Your two primary Neon databases are over quota. This is a plan limit, not a bug. "
        "The Analytics DB will serve as primary until quotas reset (monthly). To permanently fix:", s["body"]))
    story.append(two_col(
        ["Log in to console.neon.tech", "Go to main account (georgelsmith333@gmail.com)", "Upgrade to Neon Launch plan (~$19/mo)", "This restores Main DB (ep-proud-hill) with full data"],
        ["Alternative: wait for monthly quota reset", "Backup account (improvewithamit) — also over quota", "Analytics DB (ep-cool-mountain) active now as temporary primary", "All 73 orders + data are safe and accessible"],
        s["bullet"]
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph("1.3  GitHub Token — Must Refresh", s["sub_h"]))
    story.append(Paragraph(
        "All stored GitHub tokens have expired. The user-uploaded secrets file contains a new token. "
        "Update <b>GITHUB_PERSONAL_ACCESS_TOKEN</b> in Replit Secrets with the new classic token from the secrets file. "
        "This restores git-push capability and CF Pages deployment.", s["body"]))
    story.append(code_block([
        "# Secret to update in Replit → Secrets panel:",
        "GITHUB_PERSONAL_ACCESS_TOKEN = <set this in the deployment secret manager; never store the token here>",
        "",
        "# Also update Cloudflare token — all existing CF tokens returned error 1000",
        "# Generate a new token at dash.cloudflare.com → Profile → API Tokens",
        "# Use template: 'Edit Cloudflare Pages'  →  gives Pages read/write + Account read",
        "CLOUDFLARE_API_TOKEN = <new-token-from-dash.cloudflare.com>",
    ]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════
    # SECTION 2 — CURRENT STATE AUDIT
    # ══════════════════════════════════════════════════════
    story.append(section_badge("§2  CURRENT STATE AUDIT", BRAND_INDIGO))
    story.append(Spacer(1, 4))
    story.append(Paragraph("2.1  Codebase Size &amp; Structure", s["section_h"]))
    story.append(hr(BRAND_INDIGO))

    story.append(info_card([
        ("DesignStudio.tsx", "5,255 lines — monolithic React component (pain point #1)"),
        ("mockups.tsx", "917 lines — product definitions, SVG templates, photo maps"),
        ("composer.ts", "~600 lines — canvas compositing, photo blending, texture export"),
        ("ProductViewer3D.tsx", "~400 lines — Three.js / React Three Fiber 3D preview"),
        ("State management", "All in useState / useRef inside DesignStudio.tsx — no global store"),
        ("Canvas approach", "Raw HTML Canvas via refs + React drag gestures (no canvas library)"),
        ("Mockup quality", "PNG photo compositing with CSS mix-blend-mode multiply — SVG outlines only"),
    ]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("2.2  Current Features (What Works)", s["sub_h"]))
    story.append(two_col(
        ["Image layer upload (PNG, JPG, SVG, WEBP)", "Text layers (11 fonts incl. Bangla)", "Font styling: bold, italic, size, color", "Text stroke + drop shadow", "Letter spacing control", "Layer reorder (drag + arrows)", "Show/hide + lock layers", "Undo / Redo history (20 steps)"],
        ["Product switching (tshirt, hoodie, mug, cap, longsleeve, waterbottle)", "Color picker per product (~8-10 colors/product)", "Multiple faces: front, back, sleeve, neck-label", "3D preview (lazy-loaded React Three Fiber)", "AI art generation (Pollinations free API)", "Background removal (WASM + remove.bg)", "Design drafts (save/load from server)", "Add-to-cart with composed mockup image"],
        s["bullet"]
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("2.3  Current Pain Points &amp; Gaps", s["sub_h"]))

    pain_points = [
        ["#", "Issue", "Impact", "Priority"],
        ["1", "5,255-line monolithic component — impossible to maintain, slow to parse", "Critical", "P0"],
        ["2", "No PSD-quality mockups — just PNG photos + SVG outlines", "High", "P1"],
        ["3", "SVG mockups look generic (simple outlines, not photorealistic)", "High", "P1"],
        ["4", "No clipart or element library — users can only upload their own art", "High", "P1"],
        ["5", "No gradient fill — text and shapes can only be solid colors", "Medium", "P2"],
        ["6", "No vector shape drawing tool (circle, rect, star, arrow)", "Medium", "P2"],
        ["7", "No pattern/repeat fill for designs", "Medium", "P2"],
        ["8", "Mobile UX is broken — gestures conflict with page scroll", "High", "P1"],
        ["9", "No QR code generator built into studio", "Low", "P3"],
        ["10", "No design export to PNG/PDF for proof approval", "Medium", "P2"],
        ["11", "Pollinations AI quality is limited — no style control", "Medium", "P2"],
        ["12", "No social share of design before purchase", "Low", "P3"],
        ["13", "No design history/gallery per customer account", "Medium", "P2"],
        ["14", "Text warp/arc effect not supported", "Medium", "P2"],
        ["15", "No multi-layer grouping or alignment tools", "Medium", "P2"],
    ]
    t = Table(pain_points, colWidths=[8*mm, 80*mm, 28*mm, 18*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLACK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTSIZE", (0, 1), (-1, -1), 8.5),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [CARD_BG, WHITE]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        # Color the Impact column
        ("BACKGROUND", (2, 1), (2, 1), HexColor("#FEE2E2")),
        ("BACKGROUND", (2, 2), (2, 4), HexColor("#FEF3C7")),
        ("BACKGROUND", (2, 5), (2, -1), HexColor("#D1FAE5")),
        # Priority column
        ("BACKGROUND", (3, 1), (3, 2), BRAND_RED),
        ("TEXTCOLOR", (3, 1), (3, 2), WHITE),
        ("FONTNAME", (3, 1), (3, -1), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (3, 0), (3, -1), "CENTER"),
    ]))
    story.append(t)
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════
    # SECTION 3 — REDESIGNED ARCHITECTURE
    # ══════════════════════════════════════════════════════
    story.append(section_badge("§3  REDESIGNED ARCHITECTURE", BRAND_INDIGO))
    story.append(Spacer(1, 4))
    story.append(Paragraph("3.1  Component Decomposition", s["section_h"]))
    story.append(hr(BRAND_INDIGO))
    story.append(Paragraph(
        "The monolithic 5,255-line DesignStudio.tsx must be split into a clean component hierarchy. "
        "The goal is each file under 300 lines, with a clear separation of concerns.", s["body"]))
    story.append(Spacer(1, 6))

    arch = [
        ["Component / File", "Responsibility", "Lines Est."],
        ["DesignStudio.tsx", "Root page: layout shell, routing, URL params", "~150"],
        ["studio/StudioProvider.tsx", "Zustand store provider + keyboard shortcuts", "~80"],
        ["studio/CanvasArea.tsx", "HTML Canvas rendering loop, zoom/pan viewport", "~300"],
        ["studio/LayerRenderer.tsx", "Per-layer render: image, text, shape", "~200"],
        ["studio/panels/LayerPanel.tsx", "Layer list sidebar: reorder, show/hide, lock", "~200"],
        ["studio/panels/DesignPanel.tsx", "Right panel: selected layer properties", "~300"],
        ["studio/panels/TextPanel.tsx", "Text-specific controls: font, size, effects", "~250"],
        ["studio/panels/ImagePanel.tsx", "Image controls: brightness, contrast, flip", "~150"],
        ["studio/panels/ShapePanel.tsx", "Vector shape controls: fill, stroke, opacity", "~150"],
        ["studio/toolbar/MainToolbar.tsx", "Top toolbar: tool selection, undo/redo, zoom", "~180"],
        ["studio/toolbar/ProductSwitcher.tsx", "Product + color + face switcher", "~200"],
        ["studio/ProductPreview.tsx", "2D mockup + 3D preview toggle", "~150"],
        ["studio/AIPanel.tsx", "AI generation prompt + results grid", "~250"],
        ["studio/ClipArtBrowser.tsx", "Curated clipart + icon search", "~200"],
        ["studio/GradientEditor.tsx", "Gradient builder: linear, radial, conic", "~180"],
        ["studio/TemplateGallery.tsx", "Pre-built design templates grid", "~150"],
        ["studio/ExportDialog.tsx", "Export to PNG, PDF, share link", "~200"],
        ["hooks/useDesignStore.ts", "Zustand design state: layers, history, tools", "~300"],
        ["hooks/useCanvasRenderer.ts", "Canvas drawing loop, DPI scaling", "~200"],
        ["hooks/useGestures.ts", "Touch + mouse gesture handling (pinch/rotate)", "~200"],
        ["design-studio/mockups.tsx", "Product definitions (keep, minor refactor)", "~917"],
        ["design-studio/composer.ts", "Keep as-is — compositing logic is solid", "~600"],
    ]
    t = Table(arch, colWidths=[70*mm, 72*mm, 22*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLACK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [CARD_BG, WHITE]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (2, 0), (2, -1), "CENTER"),
        ("BACKGROUND", (0, 1), (0, 1), HexColor("#EEF2FF")),
        ("FONTNAME", (0, 1), (0, 1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 1), (0, 1), BRAND_INDIGO),
    ]))
    story.append(t)
    story.append(Spacer(1, 8))

    story.append(Paragraph("3.2  State Management — Zustand Design Store", s["sub_h"]))
    story.append(Paragraph(
        "Replace all the useState/useRef chaos inside DesignStudio.tsx with a typed Zustand store. "
        "This enables undo/redo, cross-component reactivity, and much easier testing.", s["body"]))
    story.append(code_block([
        "// hooks/useDesignStore.ts — shape of the global design state",
        "interface DesignStore {",
        "  layers:      Layer[];          // ordered layer stack",
        "  selectedIds: string[];         // multi-select support",
        "  history:     Layer[][];        // undo stack (50 steps)",
        "  future:      Layer[][];        // redo stack",
        "  activeTool:  ToolType;         // select|text|shape|draw|eyedrop",
        "  activeProduct: DesignProduct;",
        "  activeColor:   ProductColor;",
        "  activeFace:    Face;",
        "  zoom:          number;         // 0.25 – 4.0",
        "  panX:          number;",
        "  panY:          number;",
        "  // Actions",
        "  addLayer:    (layer: Layer) => void;",
        "  updateLayer: (id: string, patch: Partial&lt;Layer&gt;) => void;",
        "  deleteLayer: (id: string) => void;",
        "  moveLayer:   (id: string, dir: 'up'|'down') => void;",
        "  undo:        () => void;",
        "  redo:        () => void;",
        "  selectTool:  (tool: ToolType) => void;",
        "}",
    ]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════
    # SECTION 4 — MOCKUP SYSTEM UPGRADE
    # ══════════════════════════════════════════════════════
    story.append(section_badge("§4  NEW MOCKUP SYSTEM  —  PSD-Quality Renders", BRAND_TEAL))
    story.append(Spacer(1, 4))
    story.append(Paragraph("4.1  What's Wrong with the Current Approach", s["section_h"]))
    story.append(hr(BRAND_TEAL))
    story.append(Paragraph(
        "The current system uses PNG photos with CSS <b>mix-blend-mode:multiply</b> to tint white garments. "
        "This works for basic cases but fails for dark garments (no multiply), colored garments (hue shift issues), "
        "and curved products (mug, bottle) where perspective distortion is needed. "
        "SVG outlines are used as a fallback — they look like wireframes, not products.", s["body"]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("4.2  Proposed High-Fidelity Mockup System", s["sub_h"]))

    mockup_plan = [
        ["Product", "Current Method", "Proposed Upgrade", "Quality Gain"],
        ["T-Shirt (white/light)", "PNG multiply blend", "Displacement map + screen-space UV warp", "★★★★☆"],
        ["T-Shirt (dark)", "Full dark photo direct", "Dark photo + additive screen blend", "★★★★☆"],
        ["T-Shirt (color)", "Color-specific PNGs (navy/red)", "Hue-shift + lightness preserve algorithm", "★★★★★"],
        ["Hoodie", "Mix-blend multiply + cutout", "Same as T-shirt + pocket layer comp", "★★★★☆"],
        ["Long Sleeve", "Mix-blend multiply + cutout", "Per-color photo bank (6 colors covered)", "★★★★☆"],
        ["Mug (front)", "CSS perspective + multiply", "WebGL cylinder UV unwrap in Three.js", "★★★★★"],
        ["Cap (front)", "SVG tint (no 3D)", "Hemisphere distortion map in canvas", "★★★★☆"],
        ["Water Bottle", "CSS warp + cutout PNG", "Cylinder unwrap with label zone clipping", "★★★★★"],
    ]
    t = Table(mockup_plan, colWidths=[30*mm, 40*mm, 62*mm, 22*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_TEAL),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [CARD_BG, WHITE]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(t)
    story.append(Spacer(1, 8))

    story.append(Paragraph("4.3  Displacing Design Onto Garment with Canvas", s["sub_h"]))
    story.append(Paragraph(
        "For T-shirts and hoodies, a displacement map approach creates realistic fabric wrinkle effects "
        "without needing 3D. The design image is warped using the garment's gray-channel displacement map "
        "before compositing, making it look like the print follows the fabric contours.", s["body"]))
    story.append(code_block([
        "// Displacement map compositing (new composer step)",
        "async function applyDisplacementMap(",
        "  designCanvas: HTMLCanvasElement,",
        "  displacementMap: HTMLImageElement,  // grayscale bump/normal map",
        "  strength: number = 0.12",
        "): Promise&lt;HTMLCanvasElement&gt; {",
        "  // Per-pixel UV distortion based on displacement map luminance",
        "  // strength 0.08–0.15 gives realistic shirt-wrinkle effect",
        "  return displacedCanvas;",
        "}",
    ]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════
    # SECTION 5 — ADVANCED FEATURES
    # ══════════════════════════════════════════════════════
    story.append(section_badge("§5  ADVANCED FEATURES", BRAND_ORANGE))
    story.append(Spacer(1, 4))
    story.append(Paragraph("5.1  Feature Roadmap Overview", s["section_h"]))
    story.append(hr(BRAND_ORANGE))

    adv_features = [
        ["Feature", "Description", "Library / API", "Phase"],
        ["Clipart Library", "500+ curated SVG icons + illustrations categorized by theme", "Iconify API + local SVG bank", "P1"],
        ["Vector Shape Tool", "Draw circles, rectangles, stars, arrows, polygons on canvas", "Konva.js built-in shapes", "P1"],
        ["Gradient Fill", "Linear, radial, and conic gradients for text + shapes", "Canvas gradient API", "P1"],
        ["Pattern Fill", "Repeating tile patterns: stripes, dots, chevrons, custom", "Canvas createPattern", "P2"],
        ["Text Warp / Arc", "Bend text along a curve: arc, wave, flag, bulge effects", "opentype.js path calc", "P2"],
        ["Multi-select + Group", "Select N layers → group → transform together", "Zustand group state", "P1"],
        ["Smart Alignment", "Align/distribute tools: center, left, right, top, bottom", "Layer bounding box math", "P1"],
        ["Design Export (PNG/PDF)", "Download print-ready 300 DPI PNG or PDF with bleed marks", "html2canvas + jsPDF", "P1"],
        ["Share Link", "Generate short URL for design proof review + social sharing", "API short-link + R2 snapshot", "P2"],
        ["QR Code Generator", "Add QR code layer pointing to any URL", "qrcode.js in-browser", "P2"],
        ["Design Gallery / History", "Per-customer gallery of saved designs with thumbnails", "New DB table + R2 thumbnails", "P2"],
        ["Template Marketplace", "Community-submitted templates with rating + remix", "Backend moderation queue", "P3"],
        ["Background Patterns", "Preset background colors, patterns, gradients for canvas", "CSS/canvas fill presets", "P1"],
        ["Eyedropper Tool", "Sample color from uploaded design or mockup", "Canvas getImageData", "P2"],
        ["Ruler &amp; Guides", "Toggle pixel/mm rulers, drag guide lines onto canvas", "Canvas overlay rendering", "P2"],
    ]
    t = Table(adv_features, colWidths=[38*mm, 60*mm, 38*mm, 14*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_BLACK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [CARD_BG, WHITE]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (3, 0), (3, -1), "CENTER"),
        # Phase colors
        ("BACKGROUND", (3, 1), (3, 5), HexColor("#FEE2E2")),
        ("BACKGROUND", (3, 6), (3, 10), HexColor("#FEF3C7")),
        ("BACKGROUND", (3, 11), (3, -1), HexColor("#D1FAE5")),
        ("FONTNAME", (3, 1), (3, -1), "Helvetica-Bold"),
    ]))
    story.append(t)
    story.append(Spacer(1, 8))

    story.append(Paragraph("5.2  Gradient Editor — Implementation Sketch", s["sub_h"]))
    story.append(code_block([
        "// GradientEditor.tsx — creates a CanvasGradient for the selected layer",
        "interface GradientStop { offset: number; color: string }",
        "interface GradientConfig {",
        "  type: 'linear' | 'radial' | 'conic';",
        "  angle?: number;          // degrees (linear)",
        "  stops: GradientStop[];   // [{offset:0, color:'#F97316'}, {offset:1, color:'#4F46E5'}]",
        "}",
        "",
        "// Applied in LayerRenderer when layer.fill.type === 'gradient'",
        "const grad = ctx.createLinearGradient(x0, y0, x1, y1);",
        "config.stops.forEach(s => grad.addColorStop(s.offset, s.color));",
        "ctx.fillStyle = grad;",
    ]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════
    # SECTION 6 — AI INTEGRATION v2
    # ══════════════════════════════════════════════════════
    story.append(section_badge("§6  AI INTEGRATION  v2", BRAND_INDIGO))
    story.append(Spacer(1, 4))
    story.append(Paragraph("6.1  Current AI vs Proposed", s["section_h"]))
    story.append(hr(BRAND_INDIGO))

    ai_comparison = [
        ["Capability", "Current (Pollinations)", "Proposed Upgrade"],
        ["Image generation", "Free, keyless, limited quality", "Pollinations + Stable Diffusion API (optional key)"],
        ["Style control", "None — prompt only", "Style presets: cartoon, realistic, watercolor, pixel art"],
        ["Negative prompts", "Not supported", "Full negative prompt support"],
        ["Background removal", "WASM (slow) + remove.bg (API key)", "Keep WASM + add Cloudflare Worker R2 cache"],
        ["Design suggestions", "None", "AI suggest color palette + font pair from uploaded image"],
        ["Auto-compose", "None", "AI auto-place design in optimal print zone with scale/position"],
        ["Image enhance", "Basic brightness/contrast auto-fix", "Upscale 2x with Real-ESRGAN (Cloudflare Worker)"],
        ["Text-to-clipart", "None", "Simple SVG icon fetch from Iconify by keyword"],
    ]
    t = Table(ai_comparison, colWidths=[38*mm, 52*mm, 74*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_INDIGO),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [CARD_BG, WHITE]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (2, 1), (2, -1), HexColor("#EEF2FF")),
    ]))
    story.append(t)
    story.append(Spacer(1, 8))

    story.append(Paragraph("6.2  AI Style Presets Implementation", s["sub_h"]))
    story.append(code_block([
        "// AIPanel.tsx — style preset system",
        "const AI_STYLE_PRESETS = [",
        "  { id: 'realistic',   label: 'Realistic',    suffix: ', photorealistic, 8k, studio lighting' },",
        "  { id: 'cartoon',     label: 'Cartoon',      suffix: ', flat vector cartoon, bold outlines, vibrant' },",
        "  { id: 'watercolor',  label: 'Watercolor',   suffix: ', watercolor painting, soft edges, artistic' },",
        "  { id: 'pixel',       label: 'Pixel Art',    suffix: ', pixel art, 16-bit retro game style' },",
        "  { id: 'minimalist',  label: 'Minimalist',   suffix: ', clean minimalist design, simple shapes' },",
        "  { id: 'streetwear',  label: 'Streetwear',   suffix: ', bold streetwear graphic, urban aesthetic' },",
        "  { id: 'bangla',      label: 'Bangla Art',   suffix: ', traditional Bangladeshi folk art style' },",
        "];",
        "",
        "// Pollinations URL builder with negative prompt + seed",
        "const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + style.suffix)}",
        "  ?width=1024&height=1024&nologo=true&enhance=true&negative=${encodeURIComponent(neg)}`;",
    ]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════
    # SECTION 7 — TECH STACK UPGRADE
    # ══════════════════════════════════════════════════════
    story.append(section_badge("§7  TECH STACK UPGRADE", BRAND_TEAL))
    story.append(Spacer(1, 4))
    story.append(Paragraph("7.1  Recommended Stack Changes", s["section_h"]))
    story.append(hr(BRAND_TEAL))

    stack = [
        ["Layer", "Current", "Recommended Upgrade", "Reason / Benefit"],
        ["Canvas library", "Raw HTML Canvas refs", "Konva.js + react-konva", "Object model, built-in hit-testing, events, transformers"],
        ["State", "useState + useRef soup", "Zustand (typed store)", "Serializable, devtools, undo/redo trivial"],
        ["Gestures", "use-gesture + custom", "Konva transformer handles + use-gesture", "Battle-tested multi-touch, pinch-rotate built-in"],
        ["Fonts", "Google Fonts (CDN)", "Font face observer + preload hints", "No FOUT, faster first paint"],
        ["3D preview", "React Three Fiber (lazy)", "Keep R3F — it's good", "Already solid; only improve UV mapping"],
        ["Image upscale", "None", "Cloudflare Worker + Real-ESRGAN WASM", "Free, runs at edge — no GPU needed"],
        ["Design storage", "DB JSON (drafts table)", "R2 + DB reference (thumbnail + layers JSON)", "R2 cheaper for large layer JSONs"],
        ["Export", "Canvas.toDataURL", "Offscreen Canvas + Worker thread", "Non-blocking — UI stays responsive during export"],
        ["Clipart", "None", "Iconify REST API + local SVG cache", "7M+ icons, MIT license, instant search"],
        ["Build", "Vite (current)", "Keep Vite — add code-split per studio panel", "Reduce initial JS from 1.2MB to ~400KB"],
        ["Testing", "None", "Vitest + @testing-library for panel components", "Prevent regressions in layer logic"],
        ["Monitoring", "Console logs", "Sentry (free tier) on canvas errors", "Catch user-facing crashes in prod"],
    ]
    t = Table(stack, colWidths=[28*mm, 32*mm, 52*mm, 52*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND_TEAL),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E5E7EB")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [CARD_BG, WHITE]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (2, 1), (2, -1), HexColor("#F0FDF4")),
    ]))
    story.append(t)
    story.append(Spacer(1, 8))

    story.append(Paragraph("7.2  Konva.js Migration — Why &amp; How", s["sub_h"]))
    story.append(Paragraph(
        "The current raw canvas approach requires manual hit-testing, bounding box math, and transform calculations. "
        "Konva.js provides all of this out of the box plus a transformer widget for resize/rotate handles that "
        "works perfectly on both mouse and touch.", s["body"]))
    story.append(code_block([
        "# Install Konva for the storefront",
        "pnpm --filter @workspace/trynext-storefront add konva react-konva",
        "",
        "# Basic Konva stage structure:",
        "// &lt;Stage width={W} height={H}&gt;",
        "//   &lt;Layer&gt;  {/* background + mockup */}",
        "//     &lt;Image image={mockupImg} /&gt;",
        "//   &lt;/Layer&gt;",
        "//   &lt;Layer&gt;  {/* design layers */}",
        "//     {layers.map(l =&gt; &lt;DesignLayer key={l.id} layer={l} /&gt;)}",
        "//     &lt;Transformer ref={trRef} /&gt;  {/* resize+rotate handles */}",
        "//   &lt;/Layer&gt;",
        "// &lt;/Stage&gt;",
    ]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════
    # SECTION 8 — MOBILE EXPERIENCE
    # ══════════════════════════════════════════════════════
    story.append(section_badge("§8  MOBILE EXPERIENCE", BRAND_ORANGE))
    story.append(Spacer(1, 4))
    story.append(Paragraph("8.1  Current Mobile Problems", s["section_h"]))
    story.append(hr(BRAND_ORANGE))
    story.append(two_col(
        ["Page scrolls when trying to pan canvas", "Pinch-to-zoom fires on the whole page", "Tool panel overflows on small screens", "Font picker unusable on mobile"],
        ["Layer panel not accessible (hidden)", "Add-to-cart button hidden below fold", "3D preview too heavy for low-end phones", "No haptic feedback on layer select"],
        s["bullet"]
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("8.2  Mobile-First Redesign Plan", s["sub_h"]))
    story.append(info_card([
        ("Bottom sheet panels", "Replace right sidebar with bottom sheets (slide up). Layer panel = slide up from bottom."),
        ("Touch event isolation", "Canvas container uses touch-action:none — stops page scroll during canvas interaction."),
        ("Gesture library", "use-gesture already handles this — add 'target' option to scope gestures to canvas element only."),
        ("Compact toolbar", "Replace text labels with icon-only toolbar on screens <768px. Full labels on desktop."),
        ("Full-screen canvas", "Mobile: canvas takes 65% of viewport. All panels slide-over. No persistent sidebars."),
        ("Haptic feedback", "navigator.vibrate(10) on layer select/snap events on mobile."),
        ("3D preview lazy guard", "Check navigator.hardwareConcurrency < 4 → skip 3D button on low-end devices."),
        ("Expo deep link", "Add 'Customize' button in Expo app → open design studio URL with product pre-selected."),
    ]))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════
    # SECTION 9 — IMPLEMENTATION PHASES
    # ══════════════════════════════════════════════════════
    story.append(section_badge("§9  IMPLEMENTATION PHASES", BRAND_INDIGO))
    story.append(Spacer(1, 4))
    story.append(Paragraph("6-Phase Rebuild Roadmap", s["section_h"]))
    story.append(hr(BRAND_INDIGO))

    phases = [
        ["P0", "Emergency Fixes", "Complete now", "DB failover fix (✓ done), GitHub token refresh, CF token refresh", "CRITICAL"],
        ["P1", "Architecture Refactor", "1–2 weeks", "Split DesignStudio.tsx into 20 components; add Zustand store; full typecheck passes", "HIGH"],
        ["P2", "Konva.js Migration", "1–2 weeks", "Replace raw canvas with Konva Stage; Transformer widget; multi-select; alignment tools", "HIGH"],
        ["P3", "Advanced Features", "2–3 weeks", "Clipart browser, gradients, shapes, patterns, text arc, QR code, export PNG/PDF", "HIGH"],
        ["P4", "Mockup Upgrade", "1–2 weeks", "Displacement maps for T-shirts/hoodies; cylinder UV for mug/bottle; per-color photo bank expansion", "MEDIUM"],
        ["P5", "AI v2 + Mobile", "2 weeks", "Style presets AI, auto-compose, mobile bottom-sheet UX, touch-only gesture isolation", "MEDIUM"],
        ["P6", "Gallery + Community", "2–3 weeks", "Customer design gallery, template marketplace, share links, social proof", "LOW"],
    ]
    story.append(phase_table(phases))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "Total estimated rebuild time: <b>10–14 weeks</b> (working in parallel on P1–P2 since they don't conflict). "
        "P0 fixes are already applied. P1 is the highest leverage — splitting the monolith unlocks all future work.",
        s["body"]
    ))
    story.append(PageBreak())

    # ══════════════════════════════════════════════════════
    # SECTION 10 — ALL-IN-ONE COMMAND GUIDE
    # ══════════════════════════════════════════════════════
    story.append(section_badge("§10  ALL-IN-ONE COMMAND GUIDE", BRAND_BLACK))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Copy-Paste Ready Commands for Every Task", s["section_h"]))
    story.append(hr())

    story.append(Paragraph("10.1  Start / Restart All Services", s["sub_h"]))
    story.append(code_block([
        "# From workspace root — restart all workflows via Replit UI, or use these for manual runs:",
        "",
        "# API server (must rebuild after any server-side change):",
        "cd artifacts/api-server && node ./build.mjs",
        "# Then restart 'artifacts/api-server: API Server' workflow",
        "",
        "# Storefront (Vite hot-reload, no rebuild needed):",
        "pnpm --filter @workspace/trynext-storefront run dev",
        "",
        "# Full typecheck (run before every git push):",
        "pnpm run typecheck",
    ]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("10.2  Install New Dependencies", s["sub_h"]))
    story.append(code_block([
        "# Add Konva.js to storefront:",
        "pnpm --filter @workspace/trynext-storefront add konva react-konva",
        "",
        "# Add Zustand for state management:",
        "pnpm --filter @workspace/trynext-storefront add zustand",
        "",
        "# Add opentype.js for text path/arc:",
        "pnpm --filter @workspace/trynext-storefront add opentype.js",
        "pnpm --filter @workspace/trynext-storefront add --save-dev @types/opentype.js",
        "",
        "# Add qrcode for QR code generation:",
        "pnpm --filter @workspace/trynext-storefront add qrcode",
        "pnpm --filter @workspace/trynext-storefront add --save-dev @types/qrcode",
        "",
        "# Add jsPDF for design export:",
        "pnpm --filter @workspace/trynext-storefront add jspdf html2canvas",
        "",
        "# Add font-face-observer for reliable font loading:",
        "pnpm --filter @workspace/trynext-storefront add fontfaceobserver",
        "pnpm --filter @workspace/trynext-storefront add --save-dev @types/fontfaceobserver",
    ]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("10.3  Database Commands", s["sub_h"]))
    story.append(code_block([
        "# Check active database from within api-server dir:",
        "cd artifacts/api-server",
        "node --input-type=module -e \"",
        "  const { getActiveDbUrl } = await import('@workspace/db');",
        "  console.log(await getActiveDbUrl());",
        "\"",
        "",
        "# Run a direct DB health check (no auth required):",
        "curl http://localhost:80/api/healthz",
        "",
        "# Check admin stats (requires admin session cookie):",
        "curl http://localhost:80/api/admin/stats \\",
        "  -H 'Cookie: admin_session=<your-session-token>'",
        "",
        "# Force DB re-probe (switches to best available DB):",
        "curl -X POST http://localhost:80/api/admin/db/reprobe \\",
        "  -H 'Cookie: admin_session=<token>'",
        "",
        "# Run DB migrations manually:",
        "cd artifacts/api-server && node --input-type=module -e \"",
        "  const { dbReady } = await import('@workspace/db');",
        "  await dbReady;",
        "  const { runMigrations } = await import('./dist/index.mjs');",
        "\"",
    ]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("10.4  API Server Rebuild + Deploy Cycle", s["sub_h"]))
    story.append(code_block([
        "# Full deploy cycle after server-side changes:",
        "",
        "# 1. Edit source files in artifacts/api-server/src/",
        "",
        "# 2. Rebuild the bundle:",
        "cd artifacts/api-server && node ./build.mjs",
        "",
        "# 3. Restart workflow in Replit UI:",
        "#    artifacts/api-server: API Server → Stop → Start",
        "",
        "# 4. Verify it came up clean:",
        "curl http://localhost:80/api/healthz",
        "",
        "# 5. Commit + push (restores GitHub token first):",
        "git add -A",
        "git commit -m 'fix: <description>'",
        "# Use GitHub REST API to push (git CLI blocked by Replit):",
        "# Agent handles this automatically via REST API",
        "",
        "# CF Pages auto-deploys when main branch is pushed to GitHub.",
        "# Manual trigger only needed if auto-deploy hook broke.",
    ]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("10.5  Design Studio: Phase 1 Refactor Bootstrap", s["sub_h"]))
    story.append(code_block([
        "# Create folder structure for refactored studio:",
        "mkdir -p artifacts/trynex-storefront/src/pages/studio",
        "mkdir -p artifacts/trynex-storefront/src/pages/studio/panels",
        "mkdir -p artifacts/trynex-storefront/src/pages/studio/toolbar",
        "mkdir -p artifacts/trynex-storefront/src/hooks",
        "",
        "# Files to create (in order — no circular deps):",
        "# 1. src/hooks/useDesignStore.ts          ← Zustand store (no imports from studio)",
        "# 2. src/pages/studio/panels/LayerPanel.tsx",
        "# 3. src/pages/studio/panels/TextPanel.tsx",
        "# 4. src/pages/studio/panels/ImagePanel.tsx",
        "# 5. src/pages/studio/toolbar/MainToolbar.tsx",
        "# 6. src/pages/studio/toolbar/ProductSwitcher.tsx",
        "# 7. src/pages/studio/CanvasArea.tsx",
        "# 8. src/pages/studio/AIPanel.tsx",
        "# 9. src/pages/studio/ClipArtBrowser.tsx",
        "# 10. src/pages/DesignStudio.tsx          ← thin orchestrator, &lt;200 lines",
        "",
        "# After refactor, check for TS errors:",
        "pnpm --filter @workspace/trynext-storefront run typecheck",
    ]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("10.6  Konva.js Canvas Setup Boilerplate", s["sub_h"]))
    story.append(code_block([
        "// artifacts/trynex-storefront/src/pages/studio/CanvasArea.tsx",
        "import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva';",
        "import Konva from 'konva';",
        "import { useRef, useEffect } from 'react';",
        "import { useDesignStore } from '@/hooks/useDesignStore';",
        "",
        "export function CanvasArea({ mockupImg }: { mockupImg: HTMLImageElement }) {",
        "  const trRef = useRef&lt;Konva.Transformer&gt;(null);",
        "  const { layers, selectedIds, zoom } = useDesignStore();",
        "",
        "  return (",
        "    &lt;Stage width={600} height={600} scaleX={zoom} scaleY={zoom}&gt;",
        "      &lt;Layer&gt;",
        "        &lt;KonvaImage image={mockupImg} width={600} height={600} /&gt;",
        "      &lt;/Layer&gt;",
        "      &lt;Layer&gt;",
        "        {layers.map(layer =&gt; &lt;DesignLayer key={layer.id} layer={layer} /&gt;)}",
        "        &lt;Transformer ref={trRef} rotateEnabled flipEnabled /&gt;",
        "      &lt;/Layer&gt;",
        "    &lt;/Stage&gt;",
        "  );",
        "}",
    ]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("10.7  Neon DB Quota Resolution Commands", s["sub_h"]))
    story.append(code_block([
        "# Current DB status (run after API restart to confirm analytics is active):",
        "curl http://localhost:80/api/healthz | grep db",
        "",
        "# Check which DB is actually active (admin endpoint):",
        "curl http://localhost:80/api/admin/db/cluster \\",
        "  -H 'Cookie: admin_session=<token>'",
        "",
        "# When Neon main quota resets (monthly):",
        "# 1. The reprobe timer (every 60s) will automatically detect main is healthy",
        "# 2. Server will switch back to DATABASE_URL_MAIN without restart",
        "# 3. Monitor via admin DB cluster page",
        "",
        "# To force switch to best available DB immediately:",
        "curl -X POST http://localhost:80/api/admin/db/reprobe \\",
        "  -H 'Cookie: admin_session=<token>'",
    ]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("10.8  Quick Secrets Checklist", s["sub_h"]))
    story.append(info_card([
        ("GITHUB_PERSONAL_ACCESS_TOKEN", "Update in Replit Secrets → new token from uploaded secrets file"),
        ("CLOUDFLARE_API_TOKEN", "Regenerate at dash.cloudflare.com → Profile → API Tokens → Edit Pages template"),
        ("DATABASE_URL_MAIN", "✓ Set — over quota now; auto-recovery when quota resets"),
        ("DATABASE_ANALYTICS", "✓ Set and ACTIVE — 73 orders, 10 products, 3 reviews"),
        ("DATABASE_PRODUCTS", "✓ Set — standby fallback"),
        ("R2_ACCESS_KEY_ID / SECRET", "✓ Set — Cloudflare R2 storage working"),
        ("TELEGRAM_BOT_TOKEN", "✓ Set — order notifications working"),
        ("ADMIN_JWT_SECRET / ADMIN_PASSWORD", "✓ Set"),
    ]))

    story.append(PageBreak())

    # ══════════════════════════════════════════════════════
    # CLOSING
    # ══════════════════════════════════════════════════════
    story.append(section_badge("SUMMARY &amp; NEXT STEPS", BRAND_BLACK))
    story.append(Spacer(1, 6))
    story.append(Paragraph("What Was Fixed Right Now", s["sub_h"]))
    story.append(info_card([
        ("✓ DB Failover Reordered", "DATABASE_ANALYTICS promoted above DATABASE_PRODUCTS — 73 orders now visible in admin"),
        ("✓ API Server Rebuilt", "lib/db/src/index.ts updated, api-server bundle rebuilt and restarted"),
        ("→ GitHub Token", "Set GITHUB_PERSONAL_ACCESS_TOKEN in the deployment secret manager; never paste it into repository files"),
        ("→ CF Token", "Generate new CF API token at dash.cloudflare.com using 'Edit Cloudflare Pages' template"),
        ("→ Neon Upgrade", "Upgrade trynext main Neon account to restore full primary DB (optional — analytics covers for now)"),
    ], bg=HexColor("#F0FDF4"), label_color=BRAND_GREEN))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Recommended Next Build Session", s["sub_h"]))
    story.append(Paragraph(
        "The highest-leverage single action is <b>Phase 1: Architecture Refactor</b> — splitting the 5,255-line "
        "DesignStudio.tsx into focused components with Zustand state. Once that's done, all subsequent feature "
        "additions (Konva, gradients, clipart, AI v2) can be done in parallel by independent agents without "
        "stepping on each other. The refactor is a prerequisite for everything else.", s["body"]))

    story.append(Spacer(1, 12))
    story.append(hr(BRAND_ORANGE, 2))
    story.append(Paragraph(
        "Trynext Lifestyle  ·  trynext.shop  ·  Design Studio Master Plan v2.0  ·  July 2026",
        ParagraphStyle("footer", fontName="Helvetica", fontSize=8, textColor=MID_GRAY, alignment=TA_CENTER)
    ))

    doc.build(story)
    print(f"PDF generated: {output_path}")


if __name__ == "__main__":
    build_pdf("Trynext_DesignStudio_MasterPlan.pdf")
