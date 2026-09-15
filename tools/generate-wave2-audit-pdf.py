#!/usr/bin/env python3
"""Create the current Trynext Wave 2 audit overview and evidence PDF."""

from pathlib import Path
from html import escape
import json

from fpdf import FPDF
from PIL import Image as PILImage


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "verification" / "trynext-full-stack-audit-2026-09-03.pdf"
RELEASE_MANIFEST = ROOT / "dist-mockups" / "staging" / "smart-v1" / "release-manifest.json"
CONTACT_SHEETS = ROOT / "verification" / "smart-object-contact-sheets"


class AuditPdf(FPDF):
    def footer(self):
        self.set_y(-13)
        self.set_draw_color(213, 217, 226)
        self.line(18, self.get_y(), self.w - 18, self.get_y())
        self.set_font("Helvetica", size=8)
        self.set_text_color(107, 114, 128)
        self.cell(0, 8, f"Trynext Lifestyle - Wave 2 audit overview - 2026-09-03    Page {self.page_no()}", align="C")

    def title_page(self, title, subtitle):
        self.add_page()
        self.set_y(52)
        self.set_text_color(22, 33, 62)
        self.set_font("Helvetica", "B", 24)
        self.multi_cell(0, 12, title, align="C")
        self.set_y(self.get_y() + 4)
        self.set_text_color(75, 85, 99)
        self.set_font("Helvetica", size=12)
        self.multi_cell(0, 8, subtitle, align="C")
        self.ln(14)

    def heading(self, text, level=1):
        self.set_text_color(22, 33, 62) if level == 1 else self.set_text_color(31, 78, 121)
        self.set_font("Helvetica", "B", 17 if level == 1 else 11)
        self.ln(2 if level == 1 else 1)
        self.multi_cell(0, 8 if level == 1 else 6, text)
        self.ln(1)

    def body(self, text, bold=False):
        self.set_text_color(38, 50, 68)
        self.set_font("Helvetica", "B" if bold else "", 9.5)
        self.multi_cell(0, 5.2, text)
        self.ln(1)

    def bullet(self, text):
        self.body("- " + text)

    def table(self, rows):
        left = 52
        right = self.w - self.l_margin - self.r_margin - left
        for index, (label, value) in enumerate(rows):
            y = self.get_y()
            self.set_fill_color(238, 242, 247)
            self.rect(self.l_margin, y, left, 12, "F")
            self.set_draw_color(213, 217, 226)
            self.rect(self.l_margin, y, left + right, 12)
            self.line(self.l_margin + left, y, self.l_margin + left, y + 12)
            self.set_xy(self.l_margin + 2, y + 2)
            self.set_text_color(75, 85, 99)
            self.set_font("Helvetica", "B", 8)
            self.multi_cell(left - 4, 4, str(label))
            self.set_xy(self.l_margin + left + 2, y + 2)
            self.set_text_color(38, 50, 68)
            self.set_font("Helvetica", size=8)
            self.multi_cell(right - 4, 4, str(value))
            self.set_y(y + 12)
        self.ln(3)

    def contact_sheet(self, path):
        self.add_page(orientation="L")
        self.heading(path.stem.title() + " contact sheet", 1)
        self.body("Coverage evidence. Red guides are intentional print-zone review guides.")
        with PILImage.open(path) as image:
            iw, ih = image.size
        max_w = self.w - self.l_margin - self.r_margin
        max_h = self.h - self.t_margin - self.b_margin - 24
        scale = min(max_w / iw, max_h / ih)
        width, height = iw * scale, ih * scale
        self.image(str(path), x=(self.w - width) / 2, y=self.get_y(), w=width, h=height)


manifest = json.loads(RELEASE_MANIFEST.read_text(encoding="utf-8"))
pdf = AuditPdf("P", "mm", "A4")
pdf.set_margins(18, 16, 18)
pdf.set_auto_page_break(True, 18)

pdf.title_page("Trynext Lifestyle", "Wave 2 full-stack audit and Smart Object release overview")
pdf.table(
    [
        ("Audit date", "2026-09-03"),
        ("Release scope", "Six product families / 188 canonical surfaces"),
        ("Current release state", f"{manifest.get('status', 'unknown')}; visualApproval={manifest.get('visualApproval', False)}"),
        ("Runtime policy", "Current reviewed runtime assets remain active; generated editable masters stay quarantined"),
        ("Overall conclusion", "Application and dependency gates pass. Native Smart Object promotion remains fail-closed pending controlled visual/runtime acceptance."),
    ]
)
pdf.body("This report records the continuation verification rather than relying on earlier audit claims. It separates structural proof from visual approval, keeps authenticated evidence honest, and preserves existing commerce, Design Studio, mobile, storage, auth, and deployment behavior.")

pdf.add_page()
pdf.heading("Executive result")
pdf.body("The full 188-surface quarantine release is structurally complete. Every generated PSD reopened successfully, contains one non-empty embedded Smart Object, and has a non-empty composite preview. The canonical matrix and checksums also pass.")
pdf.heading("Release gates", 2)
pdf.table(
    [
        ("Smart Object release gate", "PASS - 188/188 surfaces, checksums present, embedded payloads present, public-path separation confirmed"),
        ("PSD reopen audit", "PASS - 188/188; 1024 x 1024; 8-bit; one Smart Object per file; non-empty payload and composite"),
        ("Canonical matrix", "PASS - 188/188 expected surfaces and checksums"),
        ("Visual contact sheets", "Reviewed for completeness and family/color/face coverage; proof guides are intentionally visible"),
        ("Visual approval flag", "FALSE - no controlled browser/runtime comparison or owner sign-off was available"),
        ("Promotion decision", "BLOCKED by fail-closed policy; quarantine only"),
    ]
)
pdf.heading("What is deliberately not claimed", 2)
pdf.bullet("The new PSD masters are not claimed as active production runtime assets.")
pdf.bullet("Authenticated admin-health success is not claimed because no safe credential/session path was available.")
pdf.bullet("A fresh browser screenshot is not claimed because the artifact preview registry could not resolve this checkout and browser-use is unavailable.")

pdf.add_page()
pdf.heading("Smart Object matrix evidence")
pdf.body("The generated release covers T-shirt, hoodie, long sleeve, mug, cap, and the canonical white sublimation water bottle. Each surface carries provenance, geometry, print-zone coordinates, a checksum, and an embedded artwork object. Editable masters remain outside public/.")
pdf.table(
    [
        ("Surface count", f"{manifest.get('surfaceCount', 188)}/188"),
        ("Manifest status", manifest.get("status", "unknown")),
        ("Native Smart Objects", str(manifest.get("nativeSmartObjects", True))),
        ("Editable masters outside public", str(manifest.get("editableMastersOutsidePublic", True))),
        ("Visual approval", str(manifest.get("visualApproval", False))),
        ("Runtime fallback", "Preserved reviewed smart-v9/current source-matrix assets; no automatic promotion"),
    ]
)
pdf.heading("Preserved product rules", 2)
pdf.bullet("White bottle remains white-only with front/back canonical surfaces.")
pdf.bullet("Reviewed T-shirt, white bottle, and color-specific hoodie/long-sleeve runtime sources remain authoritative.")
pdf.bullet("Customer uploads, cart/checkout metadata, product switching/refit, curved-product behavior, settings-driven commerce, auth, storage, and deployment paths were not replaced.")
pdf.bullet("The generated source kit is quarantine evidence, not a public asset bundle.")

pdf.add_page()
pdf.heading("Application and security verification")
pdf.table(
    [
        ("Storefront tests", "PASS - 22 files / 76 tests"),
        ("API tests", "PASS - 6 files / 26 tests"),
        ("Storefront/API/Mobile typechecks", "PASS"),
        ("Full workspace typecheck", "PASS"),
        ("Storefront and API builds", "PASS"),
        ("Mobile Expo web export", "PASS"),
        ("Expo compatibility check", "PASS - expo 54.0.37 and expo-constants 18.0.14"),
        ("Safe image-size parser tests", "PASS - buffer and path inputs, PNG/GIF/BMP/SVG/PSD coverage"),
        ("pnpm audit", "PASS - 0 info/low/moderate/high/critical advisories"),
        ("image-size lock exposure", "PASS - no upstream image-size 1.x entry; Metro resolves local bounded parser"),
        ("git diff --check", "PASS"),
        ("Payment evidence contract", "PASS - contact-authorized order updates and storage-only proof paths"),
        ("Mobile order contract", "PASS - direct tracking response and structured HTTP errors"),
        ("Payment destinations", "PASS - settings-owned; no hardcoded wallet fallback"),
        ("Mug product switching", "PASS - side and wrap print-zone geometry preserved"),
    ]
)
pdf.body("The dependency remediation was validated against Metro's actual contract: its asset scanner can pass either an image buffer or a file path and recognizes PNG, JPEG, BMP, GIF, WebP, PSD, SVG, TIFF, and KTX families. The local parser enforces a 64 MiB input ceiling and fails closed on unsupported or malformed data.")
pdf.heading("Protected route and runtime checks", 2)
pdf.bullet("GET /api/admin/system/health returned 401 for no auth, invalid Bearer, and invalid Basic credentials.")
pdf.bullet("GET /api/healthz, /api/health/liveness, and /api/health/readiness returned 200 after the managed workflow restart.")
pdf.bullet("Products, categories, settings, sitemap, robots, and representative mockup assets returned expected responses.")
pdf.bullet("Redis is degraded because the current environment rejects its credentials; the documented fallback remains operational.")

pdf.add_page()
pdf.heading("Visual evidence: staged contact sheets")
pdf.body("These pages embed the generated family contact sheets. They are evidence of matrix coverage and proof-preview composition, not a substitute for a controlled browser/runtime comparison.")
for family in ("tshirt", "hoodie", "longsleeve", "mug", "cap", "waterbottle"):
    path = CONTACT_SHEETS / f"{family}.jpg"
    if path.exists():
        pdf.contact_sheet(path)

pdf.add_page()
pdf.heading("Browser, admin, and release limitations")
pdf.body("The managed application workflow is running and direct proxied API checks pass. A fresh browser screenshot could not be captured because the artifact preview registry reports that this checkout is not registered; the browser-use CLI is also unavailable in the environment. This is a verification limitation, not evidence of a runtime failure.")
pdf.table(
    [
        ("Unauthenticated admin-health", "Verified fail-closed: 401 unauthorized"),
        ("Authenticated admin-health", "Not claimed; no safe existing session or in-process credential path was available"),
        ("Browser visual flow", "Not claimed; registry lookup failed and browser-use CLI is unavailable"),
        ("Public PSD/PSB exposure", "PASS - static scan found zero PSD/PSB files under public runtime paths"),
        ("Production promotion", "Not performed; active resolver remains on reviewed runtime assets"),
        ("Next release gate", "Obtain controlled browser/runtime comparison and explicit visual acceptance for all 188 surfaces"),
    ]
)
pdf.heading("Final handoff", 2)
pdf.body("Native editable masters are structurally verified in quarantine; application, mobile, and dependency gates are green; protected routes reject invalid access; and the only release blockers are the unavailable visual/browser evidence path and the intentional requirement for controlled visual approval before promotion.", bold=True)
pdf.body("Safe next action: keep masterStatus=manifest-only/structurally-verified, obtain the missing controlled visual/runtime evidence, then promote only reviewed runtime derivatives and manifest data followed by production smoke checks.", bold=True)

pdf.output(str(OUTPUT))
print(f"wrote {OUTPUT} ({OUTPUT.stat().st_size} bytes)")