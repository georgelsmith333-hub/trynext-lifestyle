import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile Design Studio upload workflow", () => {
  it("opens the selected image's edit controls after a successful upload", () => {
    const source = readFileSync(new URL("./DesignStudioV2.tsx", import.meta.url), "utf8");
    const uploadHandler = source.slice(source.indexOf("const handleFileUpload"), source.indexOf("const replaceSelectedImage"));

    expect(uploadHandler).toContain('setActiveTab("upload")');
    expect(uploadHandler).toContain("setMobileToolOpen(true)");
    expect(uploadHandler).not.toContain('setActiveTab("layers")');
  });

  it("keeps a direct route from image tools into the approved AI reference workflow", () => {
    const studio = readFileSync(new URL("./DesignStudioV2.tsx", import.meta.url), "utf8");
    const imagePanel = readFileSync(new URL("./panels/ImagePanel.tsx", import.meta.url), "utf8");

    expect(studio).toContain('onOpenAiReference={() => setActiveTab("ai")}');
    expect(imagePanel).toContain("Refine this image with AI");
    expect(imagePanel).toContain("AI reference edits require your approval");
  });

  it("reopens image tools when an artwork layer is double-clicked or double-tapped", () => {
    const canvas = readFileSync(new URL("./CanvasArea.tsx", import.meta.url), "utf8");
    const layer = readFileSync(new URL("./DesignLayer.tsx", import.meta.url), "utf8");
    const studio = readFileSync(new URL("./DesignStudioV2.tsx", import.meta.url), "utf8");

    expect(canvas).toContain("onOpenImageTools");
    expect(layer).toContain("onDblClick");
    expect(layer).toContain("onDblTap");
    expect(layer).toContain("onOpenImageTools?.()");
    expect(studio).toContain('setActiveTab("upload")');
    expect(studio).toContain("if (isMobile) setMobileToolOpen(true)");
  });

  it("bounds server and client background-removal waits while retaining the original image on failure", () => {
    const studio = readFileSync(new URL("./DesignStudioV2.tsx", import.meta.url), "utf8");
    const removeBgRoute = readFileSync(new URL("../../../../api-server/src/routes/removeBg.ts", import.meta.url), "utf8");

    expect(studio).toContain("AbortController");
    expect(studio).toContain("Background removal timed out. Your original image is unchanged; please retry.");
    expect(studio).toContain("withOperationTimeout");
    expect(removeBgRoute).toContain("AbortSignal.timeout(REMOVE_BG_UPSTREAM_TIMEOUT_MS)");
    expect(removeBgRoute).toContain('error: "remove_bg_timeout"');
    expect(removeBgRoute).toContain("Your original artwork was kept; please retry.");
  });

  it("shows material effects only over visible artwork in the matching print zone", () => {
    const studio = readFileSync(new URL("./DesignStudioV2.tsx", import.meta.url), "utf8");

    expect(studio).toContain("hasVisibleArtworkOnFace");
    expect(studio).toContain("materialEffectClipPath");
    expect(studio).toContain("activePsdMaterialEffects.length > 0 && hasVisibleArtworkOnFace");
  });
});
