import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

export const Dropdown = ({
  trigger,
  items = [],
  align = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -5 }}
            transition={{ duration: 0.15 }}
            className={clsx(
              'absolute z-50 mt-2 w-56 rounded-xl bg-slate-900/95 border border-white/10 shadow-2xl backdrop-blur-xl p-1.5 overflow-hidden',
              align === 'right' ? 'right-0' : 'left-0',
              className
            )}
          >
            {items.map((item, idx) => {
              if (item.divider) {
                return <div key={idx} className="my-1 border-t border-white/10" />;
              }

              const ItemIcon = item.icon;

              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (item.onClick) item.onClick();
                    setIsOpen(false);
                  }}
                  className={clsx(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors font-medium text-left',
                    item.danger
                      ? 'text-rose-400 hover:bg-rose-500/10'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {ItemIcon && <ItemIcon className="w-4 h-4" />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dropdown;
