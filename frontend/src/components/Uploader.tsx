import { useCallback, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

export default function Uploader({ file, onFile }: { file: File | null; onFile: (f: File | null) => void }) {
  const [drag, setDrag] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const accept = useCallback((f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
    onFile(f);
  }, [onFile, preview]);

  const clear = () => { if (preview) URL.revokeObjectURL(preview); setPreview(null); onFile(null); };

  if (file && preview) {
    return (
      <div className="relative rounded-2xl overflow-hidden border border-border bg-black/5">
        <img src={preview} alt="Selected" className="w-full max-h-[380px] object-contain" />
        <button type="button" onClick={clear} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 grid place-items-center shadow hover:bg-white" aria-label="Remove image">
          <X size={16} />
        </button>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent text-white text-xs px-3 py-2">
          {file.name} · {(file.size / 1024).toFixed(0)} KB
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); accept(e.dataTransfer.files?.[0]); }}
      className={`rounded-2xl border-2 border-dashed p-6 sm:p-10 text-center transition-colors ${drag ? "border-royal bg-royal-tint" : "border-border bg-white"}`}
    >
      <div className="mx-auto h-14 w-14 rounded-2xl bg-turquoise-tint text-turquoise-deep grid place-items-center mb-3"><ImagePlus size={26} /></div>
      <p className="font-semibold text-ink">Drop a photo here, or choose one</p>
      <p className="text-xs text-ink-soft mt-1 mb-4">Fill the frame with the area of concern · good light · no filters · JPG, PNG or WEBP up to 20 MB</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="btn-primary" onClick={() => inputRef.current?.click()}><ImagePlus size={16} /> Choose photo</button>
        <button type="button" className="btn-secondary" onClick={() => camRef.current?.click()}><Camera size={16} /> Take photo</button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => accept(e.target.files?.[0])} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => accept(e.target.files?.[0])} />
    </div>
  );
}
