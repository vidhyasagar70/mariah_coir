import React from 'react';
import { Search, Plus, Menu } from 'lucide-react';

export default function Header({ title, subtitle, search, setSearch, onAddAction, addActionLabel, onToggleMobileSidebar }) {
  return (
    <header className="bg-white border-b border-[#E8DCD0] px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 sticky top-0 z-20 shadow-xs">
      <div className="flex items-center space-x-3 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 rounded-lg text-[#5C3B21] hover:bg-[#FAF0E6] transition-colors cursor-pointer shrink-0"
          title="Open Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl font-bold text-[#2E1C11] tracking-tight leading-snug truncate">{title}</h2>
          {subtitle && <p className="text-xs text-[#7A6759] truncate mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center justify-end space-x-2.5">

        {/* Primary Action Button */}
        {onAddAction && addActionLabel && (
          <button
            onClick={onAddAction}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>{addActionLabel}</span>
          </button>
        )}
      </div>
    </header>
  );
}
