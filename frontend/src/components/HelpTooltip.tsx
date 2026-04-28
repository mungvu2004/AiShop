import { useState } from 'react';

interface HelpTooltipProps {
  text: string;
  position?: 'right' | 'left' | 'top';
}

export const HelpTooltip = ({ text, position = 'right' }: HelpTooltipProps) => {
  const [visible, setVisible] = useState(false);

  const posClass =
    position === 'right'
      ? 'left-full top-1/2 -translate-y-1/2 ml-2'
      : position === 'left'
      ? 'right-full top-1/2 -translate-y-1/2 mr-2'
      : 'bottom-full left-1/2 -translate-x-1/2 mb-2';

  return (
    <span
      className="relative inline-flex items-center ml-1 cursor-help shrink-0"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className="w-4 h-4 bg-gray-200 hover:bg-blue-100 text-gray-500 hover:text-blue-600 rounded-full text-[10px] font-bold flex items-center justify-center transition-colors select-none">
        ?
      </span>
      {visible && (
        <span
          className={`absolute ${posClass} z-50 bg-gray-800 text-white text-xs rounded-xl px-3 py-2.5 shadow-xl w-64 pointer-events-none leading-relaxed whitespace-normal`}
        >
          {text}
        </span>
      )}
    </span>
  );
};
