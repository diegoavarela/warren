"use client";

import { useState, useEffect, useRef } from 'react';

interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

interface ContextMenuProps {
  items: MenuItem[];
  children: React.ReactNode;
}

export function ContextMenu({ items, children }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setPosition({ x: e.clientX, y: e.clientY });
    setIsOpen(true);
  };

  const handleClick = () => {
    setIsOpen(false);
  };

  const handleMenuItemClick = (item: MenuItem) => {
    if (!item.disabled) {
      item.onClick();
    }
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <>
      <div onContextMenu={handleContextMenu} onClick={handleClick}>
        {children}
      </div>
      
      {isOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[140px]"
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => handleMenuItemClick(item)}
              disabled={item.disabled}
              className={`
                w-full px-3 py-2 text-left text-sm flex items-center space-x-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed
                ${item.destructive ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}
              `}
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}