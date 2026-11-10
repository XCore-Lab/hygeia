import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, SendHorizonal } from "lucide-react";

interface Props {
  disabled?: boolean;
  placeholder: string;
  inputMode?: "text" | "numeric";
  allowAttach: boolean;
  onSend: (text: string) => void;
  onPickGallery: () => void;
  onPickCamera: () => void;
}

/** Message input with photo attach buttons. Fixed to the bottom of the chat column. */
export default function Composer({ disabled, placeholder, inputMode = "text", allowAttach, onSend, onPickGallery, onPickCamera }: Props) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow up to ~5 lines.
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(140, Math.max(44, el.scrollHeight))}px`;
  }, [text]);

  const submit = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t); setText("");
  };

  return (
    <div className="border-t border-border bg-ice/95 backdrop-blur px-3 sm:px-4 pt-2 safe-bottom">
      <div className="mx-auto max-w-3xl flex items-end gap-2">
        {allowAttach && (
          <div className="flex items-center gap-1 pb-1">
            <button type="button" onClick={onPickGallery} disabled={disabled} aria-label="Choose a photo"
              className="h-10 w-10 grid place-items-center rounded-full text-royal hover:bg-royal-tint disabled:opacity-40 transition-colors">
              <ImagePlus size={20} />
            </button>
            <button type="button" onClick={onPickCamera} disabled={disabled} aria-label="Take a photo"
              className="h-10 w-10 grid place-items-center rounded-full text-royal hover:bg-royal-tint disabled:opacity-40 transition-colors sm:hidden">
              <Camera size={20} />
            </button>
          </div>
        )}
        <div className="flex-1 flex items-end rounded-3xl border border-border bg-white shadow-sm focus-within:ring-2 focus-within:ring-royal/25 transition-shadow">
          <textarea
            ref={ref}
            rows={1}
            value={text}
            disabled={disabled}
            inputMode={inputMode}
            placeholder={placeholder}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            className="flex-1 resize-none bg-transparent px-4 py-2.5 text-[16px] sm:text-[15px] leading-6 text-ink placeholder:text-ink-soft/70 focus:outline-none disabled:opacity-60 max-h-[140px]"
            aria-label="Message"
          />
          <button type="button" onClick={submit} disabled={disabled || !text.trim()} aria-label="Send"
            className="m-1 h-9 w-9 shrink-0 grid place-items-center rounded-full bg-royal text-white hover:bg-royal-dark disabled:opacity-30 transition-colors">
            <SendHorizonal size={17} />
          </button>
        </div>
      </div>
      <p className="mx-auto max-w-3xl text-[10px] text-ink-soft/70 text-center mt-1.5 leading-tight">
        Private and anonymous. Severe pain, heavy bleeding or fever: contact your local emergency service.
      </p>
    </div>
  );
}
