import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Crop, Maximize2, X } from "lucide-react";

interface Props {
  file: File;
  onDone: (cropped: File) => void;
  onUseFull: () => void;
  onCancel: () => void;
}

type Rect = { x: number; y: number; w: number; h: number }; // normalised 0..1 in image space
type Drag = { mode: "move" | "nw" | "ne" | "sw" | "se"; start: { px: number; py: number }; rect: Rect };

const MIN = 0.08;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Full-screen crop step shown right after a photo is picked. Touch and mouse (pointer events). */
export default function CropSheet({ file, onDone, onUseFull, onCancel }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [rect, setRect] = useState<Rect>({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  useEffect(() => { const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);

  // Where the (object-contain) image actually sits inside the frame.
  const measure = useCallback(() => {
    const img = imgRef.current, fr = frameRef.current;
    if (!img || !fr || !img.naturalWidth) return;
    const fw = fr.clientWidth, fh = fr.clientHeight;
    const s = Math.min(fw / img.naturalWidth, fh / img.naturalHeight);
    const width = img.naturalWidth * s, height = img.naturalHeight * s;
    setBox({ left: (fw - width) / 2, top: (fh - height) / 2, width, height });
  }, []);
  useEffect(() => { window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure); }, [measure]);

  const toImg = (e: React.PointerEvent) => {
    if (!box || !frameRef.current) return { px: 0, py: 0 };
    const r = frameRef.current.getBoundingClientRect();
    return { px: (e.clientX - r.left - box.left) / box.width, py: (e.clientY - r.top - box.top) / box.height };
  };

  const onDown = (mode: Drag["mode"]) => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, start: toImg(e), rect };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const p = toImg(e); const dx = p.px - d.start.px, dy = p.py - d.start.py;
    let { x, y, w, h } = d.rect;
    if (d.mode === "move") { x = clamp(x + dx, 0, 1 - w); y = clamp(y + dy, 0, 1 - h); }
    else {
      let x2 = x + w, y2 = y + h;
      if (d.mode.includes("w")) x = clamp(x + dx, 0, x2 - MIN); else x2 = clamp(x2 + dx, x + MIN, 1);
      if (d.mode.includes("n")) y = clamp(y + dy, 0, y2 - MIN); else y2 = clamp(y2 + dy, y + MIN, 1);
      w = x2 - x; h = y2 - y;
    }
    setRect({ x, y, w, h });
  };
  const onUp = () => { drag.current = null; };

  const confirm = async () => {
    const img = imgRef.current; if (!img) return;
    setBusy(true);
    try {
      // Decode with EXIF orientation applied so the crop matches what the user saw.
      let source: CanvasImageSource = img; let W = img.naturalWidth, H = img.naturalHeight;
      try { const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions); source = bmp; W = bmp.width; H = bmp.height; } catch { /* fall back to the element */ }
      const sx = Math.round(rect.x * W), sy = Math.round(rect.y * H), sw = Math.max(1, Math.round(rect.w * W)), sh = Math.max(1, Math.round(rect.h * H));
      const scale = Math.min(1, 2048 / Math.max(sw, sh));
      const c = document.createElement("canvas"); c.width = Math.round(sw * scale); c.height = Math.round(sh * scale);
      c.getContext("2d")!.drawImage(source, sx, sy, sw, sh, 0, 0, c.width, c.height);
      const blob: Blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("crop failed"))), "image/jpeg", 0.92));
      onDone(new File([blob], (file.name.replace(/\.[^.]+$/, "") || "photo") + "_crop.jpg", { type: "image/jpeg" }));
    } finally { setBusy(false); }
  };

  const handle = "absolute h-7 w-7 -m-3.5 rounded-full bg-white border-2 border-royal shadow touch-none";
  const b = box;
  return (
    <div className="fixed inset-0 z-50 bg-royal-dark/95 text-white flex flex-col" role="dialog" aria-label="Crop your photo">
      <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <div className="flex items-center gap-2 text-sm font-semibold"><Crop size={16} className="text-turquoise" /> Crop to the area of concern</div>
        <button onClick={onCancel} aria-label="Cancel" className="h-9 w-9 grid place-items-center rounded-full hover:bg-white/10"><X size={18} /></button>
      </div>
      <p className="px-4 pb-2 text-[12px] text-white/70 leading-snug">Drag the box to move it, pull a corner to resize. Keep only the skin area you are worried about; faces and surroundings are left out.</p>

      <div ref={frameRef} className="relative flex-1 min-h-0 mx-3 overflow-hidden select-none touch-none" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {url && <img ref={imgRef} src={url} alt="" onLoad={measure} className="absolute inset-0 w-full h-full object-contain pointer-events-none" draggable={false} />}
        {b && (
          <>
            {/* dim outside the crop */}
            <div className="absolute bg-black/55 pointer-events-none" style={{ left: b.left, top: b.top, width: b.width, height: rect.y * b.height }} />
            <div className="absolute bg-black/55 pointer-events-none" style={{ left: b.left, top: b.top + (rect.y + rect.h) * b.height, width: b.width, height: (1 - rect.y - rect.h) * b.height }} />
            <div className="absolute bg-black/55 pointer-events-none" style={{ left: b.left, top: b.top + rect.y * b.height, width: rect.x * b.width, height: rect.h * b.height }} />
            <div className="absolute bg-black/55 pointer-events-none" style={{ left: b.left + (rect.x + rect.w) * b.width, top: b.top + rect.y * b.height, width: (1 - rect.x - rect.w) * b.width, height: rect.h * b.height }} />
            {/* crop box */}
            <div className="absolute border-2 border-turquoise cursor-move touch-none" onPointerDown={onDown("move")}
              style={{ left: b.left + rect.x * b.width, top: b.top + rect.y * b.height, width: rect.w * b.width, height: rect.h * b.height, boxShadow: "0 0 0 1px rgba(0,0,0,.4) inset" }}>
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">{Array.from({ length: 9 }).map((_, i) => <div key={i} className="border border-white/40" />)}</div>
              <div className={`${handle} left-0 top-0 cursor-nwse-resize`} onPointerDown={onDown("nw")} />
              <div className={`${handle} right-0 top-0 cursor-nesw-resize`} onPointerDown={onDown("ne")} />
              <div className={`${handle} left-0 bottom-0 cursor-nesw-resize`} onPointerDown={onDown("sw")} />
              <div className={`${handle} right-0 bottom-0 cursor-nwse-resize`} onPointerDown={onDown("se")} />
            </div>
          </>
        )}
      </div>

      <div className="px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col sm:flex-row gap-2 sm:justify-end">
        <button onClick={onUseFull} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-4 py-2.5 text-sm font-medium hover:bg-white/10 disabled:opacity-50"><Maximize2 size={15} /> Use the whole photo</button>
        <button onClick={confirm} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-full bg-turquoise text-royal-dark px-5 py-2.5 text-sm font-semibold hover:bg-turquoise/90 disabled:opacity-50"><Check size={16} /> {busy ? "Cropping…" : "Use this area"}</button>
      </div>
    </div>
  );
}
