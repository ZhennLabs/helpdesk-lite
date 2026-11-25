import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Tooltip({ text, children, placement = 'top' }) {
    const [pos, setPos] = useState(null);
    const triggerRef = useRef(null);

    const show = () => {
        if (!text || !triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setPos({
            left: rect.left + rect.width / 2,
            top: placement === 'bottom' ? rect.bottom + 8 : rect.top - 8,
        });
    };

    const hide = () => setPos(null);

    return (
        <>
            <span
                ref={triggerRef}
                onMouseEnter={show}
                onMouseLeave={hide}
                onFocus={show}
                onBlur={hide}
                className="inline-flex"
            >
                {children}
            </span>
            {pos &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        style={{ left: pos.left, top: pos.top }}
                        className={`fixed z-[9999] -translate-x-1/2 pointer-events-none px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold whitespace-nowrap shadow-lg ${
                            placement === 'bottom' ? '' : '-translate-y-full'
                        }`}
                    >
                        {text}
                    </div>,
                    document.body
                )}
        </>
    );
}
