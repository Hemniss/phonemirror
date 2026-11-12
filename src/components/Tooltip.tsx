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
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="text-fg-3 hover:text-fg transition-colors"
        aria-label="Plus d'informations"
      >
        <Info size={13} aria-hidden="true" />
      </button>

      {visible && (
        <div role="tooltip" className="pm-tip og-dialog text-fg-2">
          {content}
        </div>
      )}
    </div>
  );
}
