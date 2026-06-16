/* ═══════════════════════════════════════════════════════
   PRODUCT VIEWER 3D — realtime preview using R3F

   Mug wrap texture layout (2048×768):
     [0 – 1024]    = Left Side  (front face layers, handle-side ≈ right)
     [1024 – 2048] = Right Side (back face layers, handle-side ≈ left)

   UV offset = 0.25 (set in MugBody):
     u_geo=0.00 (+Z front)  → u_tex=0.25 → canvas x=512  (centre left half) ✓
     u_geo=0.50 (−Z back)   → u_tex=0.75 → canvas x=1536 (centre right half) ✓

   Wrap mode: back layers compose into full 2048 canvas (no half-split).

   MUG + WATER BOTTLE 3D strategy (v2):
     We now use PhotoMockupMesh — the real product photography as a textured
     plane — for both mug and water bottle. This gives photorealistic quality
     (studio-lit product photo + design overlay) vs the procedural cylinder.
     The design texture is composed by useFaceTexture at the correct print zone
     coordinates, then overlaid transparently on the product photo plane.
════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import {
  composeLayers,
  type ComposerLayer,
  type ComposerPrintZone,
} from "./composer";
import { BASE_BY_CATEGORY, isNearBlack, type DesignProduct } from "./mockups";
import {
  RealisticShirt,
  PhotoMockupMesh,
  ResettableOrbitControls,
  ViewerLoadingOverlay,
  NoWebGLFallback,
  StudioLightRig,
  hasWebGL2,
  VIEWER_DEFAULTS,
  VIEWER_FRAMING,
  VIEWER_FRAMING_BACK,
} from "../../components/garment3d";

interface FacePayload {
  layers: ComposerLayer[];
  printZone: ComposerPrintZone;
  baseHeight: number;
}

export interface ProductViewer3DProps {
  product: DesignProduct;
  garmentColor: string;
  front: FacePayload;
  back?: FacePayload;
  activeFace?: "front" | "back";
  /** True when the mug is in "Full Wrap" mode — back layers fill the full 360° body. */
  isWrapMode?: boolean;
}

/* ── Generic face texture (garments: tshirt / longsleeve / hoodie / cap) ─── */
function useFaceTexture(
  face: FacePayload | undefined,
  garmentColor: string | null,
  opts: { outW: number; outH: number; clipToPrintZone?: boolean }
): THREE.CanvasTexture | null {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const [, setVersion] = useState(0);

  if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
  if (!textureRef.current) {
    const tex = new THREE.CanvasTexture(canvasRef.current);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    textureRef.current = tex;
  }

  const sig = face
    ? JSON.stringify({
        g: garmentColor,
        z: face.printZone,
        h: face.baseHeight,
        l: face.layers.map((l) =>
          l.type === "image"
            ? [
                l.visible, l.transform, l.naturalW, l.naturalH, l.src.slice(0, 64),
                l.flipH, l.flipV, l.brightness, l.contrast, l.saturation,
              ]
            : [
                l.visible, l.transform, l.text, l.fontFamily, l.fontSize,
                l.fontStyle, l.fontWeight, l.color,
                l.textAlign, l.letterSpacing, l.strokeColor, l.strokeWidth,
                l.shadowColor, l.shadowBlur, l.shadowOffsetX, l.shadowOffsetY,
              ]
        ),
      })
    : "";

  const faceRef = useRef(face);
  faceRef.current = face;
  const clipFlag = opts.clipToPrintZone ?? true;

  useEffect(() => {
    const f = faceRef.current;
    if (!f) return;
    let cancelled = false;
    composeLayers({
      canvas: canvasRef.current!,
      baseHeight: f.baseHeight,
      printZone: f.printZone,
      layers: f.layers,
      garmentColor,
      outW: opts.outW,
      outH: opts.outH,
      imageCache: cacheRef.current,
      clipToPrintZone: clipFlag,
      blendMode: "multiply",
    }).then(() => {
      if (cancelled) return;
      if (textureRef.current) textureRef.current.needsUpdate = true;
      setVersion((v) => v + 1);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, garmentColor, opts.outW, opts.outH, clipFlag]);

  return face ? textureRef.current : null;
}

/* ── Camera rig: smooth orbit to the active face ─────────────────────────── */
function CameraRig({
  activeFace,
  category,
}: {
  activeFace: "front" | "back";
  category: "tshirt" | "longsleeve" | "hoodie" | "cap" | "mug" | "waterbottle";
}) {
  const f = VIEWER_FRAMING[category];
  const b = VIEWER_FRAMING_BACK[category] || {};
  const hasBackFace = category === "tshirt" || category === "longsleeve" || category === "hoodie" || category === "mug";
  const isBack = hasBackFace && activeFace === "back";
  const targetY = isBack ? Math.PI : 0;
  const radius  = isBack && b.radius   !== undefined ? b.radius   : f.radius;
  const cameraY = isBack && b.cameraY  !== undefined ? b.cameraY  : f.cameraY;

  useFrame(({ camera }) => {
    const cur  = Math.atan2(camera.position.x, camera.position.z);
    const next = cur + (targetY - cur) * 0.06;
    camera.position.x = Math.sin(next) * radius;
    camera.position.z = Math.cos(next) * radius;
    camera.position.y = cameraY;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function ProductViewer3D({
  product,
  garmentColor,
  front,
  back,
  activeFace = "front",
  isWrapMode = false,
}: ProductViewer3DProps) {
  const isMug         = product.category === "mug";
  const isWaterBottle = product.category === "waterbottle";
  const isGarment     = !isMug && !isWaterBottle;

  /* ── Photo selection: pick the dark product photo for near-black colours ──
   * Products that have a dedicated dark/black photo (mug, cap) switch to it
   * when garmentColor is near-black so the 3D scene uses the real black photo.
   * For all other products or non-dark colours, use the white/base photo and
   * apply garmentColor as the Three.js material colour (multiply-tint). */
  const nearBlack = isNearBlack(garmentColor);
  const base = BASE_BY_CATEGORY[product.category as keyof typeof BASE_BY_CATEGORY];
  const hasDarkPhoto = nearBlack && base && (base.darkFront || base.darkBack);
  const resolvedFrontPhoto = hasDarkPhoto && base?.darkFront ? base.darkFront : product.frontSrc;
  const resolvedBackPhoto  = hasDarkPhoto && base?.darkBack  ? base.darkBack  : (product.backSrc ?? product.frontSrc);
  /* tint = undefined → no colour multiplication (dark photo already correct colour) */
  const photoTint = hasDarkPhoto ? undefined : garmentColor;

  /* Garments (tshirt / longsleeve / hoodie / cap): transparent per-face overlays */
  const frontTex = useFaceTexture(
    isGarment ? front : undefined,
    null,
    { outW: 1024, outH: 1024, clipToPrintZone: true }
  );
  const backTex = useFaceTexture(
    isGarment && back ? back : undefined,
    null,
    { outW: 1024, outH: 1024, clipToPrintZone: true }
  );

  /* Mug: photo-mockup approach — front and back design overlays on the product photo. */
  const mugFrontTex = useFaceTexture(
    isMug ? front : undefined,
    null,
    { outW: 1024, outH: 1024, clipToPrintZone: true }
  );
  const mugBackTex = useFaceTexture(
    isMug && back ? back : undefined,
    null,
    { outW: 1024, outH: 1024, clipToPrintZone: true }
  );

  /* Water bottle: photo-mockup overlay */
  const bottleFrontTex = useFaceTexture(
    isWaterBottle ? front : undefined,
    null,
    { outW: 1024, outH: 1024, clipToPrintZone: true }
  );

  const supports3D = useMemo(() => hasWebGL2(), []);

  /* Fallback 2D composition for WebGL-less devices */
  const [fallbackUrl, setFallbackUrl] = useState<string | undefined>();
  useEffect(() => {
    if (supports3D || !front) return;
    const c = document.createElement("canvas");
    composeLayers({
      canvas: c,
      baseHeight: front.baseHeight,
      printZone: front.printZone,
      layers: front.layers,
      garmentColor: null,
      outW: 1024,
      outH: 1024,
      imageCache: new Map(),
      clipToPrintZone: true,
      blendMode: "source-over",
    }).then(() => setFallbackUrl(c.toDataURL("image/png")));
  }, [supports3D, front]);

  /* No WebGL2 → flat 2D photo mockup fallback */
  if (!supports3D) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <NoWebGLFallback
          garmentSrc={product.frontSrc}
          designSrc={fallbackUrl}
          garmentColor={garmentColor}
        />
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas
        shadows
        dpr={VIEWER_DEFAULTS.dpr}
        camera={{ position: VIEWER_DEFAULTS.cameraPosition, fov: VIEWER_DEFAULTS.fov }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        style={{ width: "100%", height: "100%", background: "transparent" }}
      >
        <Suspense fallback={null}>
          <StudioLightRig rim />
          <Environment preset="studio" />
          <CameraRig activeFace={activeFace} category={product.category} />

          {/* ── MUG — real product photo + design overlay + garment colour tint ── */}
          {product.category === "mug" && (
            <PhotoMockupMesh
              frontPhotoSrc={resolvedFrontPhoto}
              backPhotoSrc={resolvedBackPhoto}
              frontTex={mugFrontTex}
              backTex={mugBackTex}
              garmentColor={photoTint}
              activeFace={activeFace}
              planeW={2.55}
              planeH={2.55}
            />
          )}

          {/* ── T-SHIRT — real photo plane + colour tint (same as hoodie/longsleeve) ── */}
          {product.category === "tshirt" && (
            <PhotoMockupMesh
              frontPhotoSrc={resolvedFrontPhoto}
              backPhotoSrc={resolvedBackPhoto}
              frontTex={frontTex}
              backTex={backTex}
              garmentColor={photoTint}
              activeFace={activeFace}
            />
          )}

          {/* ── LONG SLEEVE — real photo plane + colour tint ── */}
          {product.category === "longsleeve" && (
            <PhotoMockupMesh
              frontPhotoSrc={resolvedFrontPhoto}
              backPhotoSrc={resolvedBackPhoto}
              frontTex={frontTex}
              backTex={backTex}
              garmentColor={photoTint}
              activeFace={activeFace}
            />
          )}

          {/* ── HOODIE — real photo plane + colour tint ── */}
          {product.category === "hoodie" && (
            <PhotoMockupMesh
              frontPhotoSrc={resolvedFrontPhoto}
              backPhotoSrc={resolvedBackPhoto}
              frontTex={frontTex}
              backTex={backTex}
              garmentColor={photoTint}
              activeFace={activeFace}
            />
          )}

          {/* ── CAP — real photo plane; dark photo for black ── */}
          {product.category === "cap" && (
            <PhotoMockupMesh
              frontPhotoSrc={resolvedFrontPhoto}
              frontTex={frontTex}
              garmentColor={photoTint}
              activeFace={activeFace}
              planeW={2.2}
              planeH={2.2}
            />
          )}

          {/* ── WATER BOTTLE — real photo plane + colour tint ── */}
          {product.category === "waterbottle" && (
            <PhotoMockupMesh
              frontPhotoSrc={resolvedFrontPhoto}
              frontTex={bottleFrontTex}
              garmentColor={photoTint}
              activeFace="front"
              planeW={2.20}
              planeH={2.80}
            />
          )}

          <ContactShadows
            position={[0, VIEWER_FRAMING[product.category].shadowY, 0]}
            opacity={0.55}
            blur={2.8}
            scale={8}
            far={6}
            color="#1a0a00"
          />

          <ResettableOrbitControls
            enablePan={false}
            enableZoom={true}
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={0.7}
            zoomSpeed={0.8}
            minDistance={VIEWER_FRAMING[product.category].minDistance}
            maxDistance={VIEWER_FRAMING[product.category].maxDistance}
            minPolarAngle={isMug ? Math.PI * 0.35 : Math.PI * 0.25}
            maxPolarAngle={isMug ? Math.PI * 0.70 : Math.PI * 0.65}
            touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
          />
        </Suspense>
      </Canvas>
      <ViewerLoadingOverlay />
    </div>
  );
}
