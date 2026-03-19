import { Info } from "lucide-react";
import { useState } from "react";

export default function Tooltip({ content }: { content: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="text-slate-600 hover:text-slate-400 transition-colors"
      >
        <Info size={13} />
      </button>

      {visible && (
        <div
          className="
            absolute left-5 top-1/2 -translate-y-1/2 z-50 w-60 p-3
            rounded-lg text-xs leading-relaxed
            bg-slate-800 border border-slate-700 text-slate-300 shadow-xl
            dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300
            light:bg-white light:border-slate-200 light:text-slate-600
            animate-fade-in pointer-events-none
          "
        >
          {content}
        </div>
      )}
    </div>
  );
}
