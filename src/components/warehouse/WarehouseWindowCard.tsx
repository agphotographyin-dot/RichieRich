import React, { useState } from 'react';
import { Maximize2, Minimize2, ChevronUp, ChevronDown, LucideIcon, X } from 'lucide-react';

interface WarehouseWindowCardProps {
  id?: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconBgClass?: string;
  iconColorClass?: string;
  badge?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  maximizedContent?: React.ReactNode;
  defaultCollapsed?: boolean;
  className?: string;
  bodyClassName?: string;
  allowMaximize?: boolean;
  allowCollapse?: boolean;
}

export const WarehouseWindowCard: React.FC<WarehouseWindowCardProps> = ({
  id,
  title,
  subtitle,
  icon: Icon,
  iconBgClass = 'bg-amber-50',
  iconColorClass = 'text-amber-700',
  badge,
  headerAction,
  children,
  maximizedContent,
  defaultCollapsed = false,
  className = '',
  bodyClassName = 'p-4 sm:p-5',
  allowMaximize = true,
  allowCollapse = true,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isMaximized, setIsMaximized] = useState(false);

  return (
    <>
      <div
        id={id}
        className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs transition-all duration-200 overflow-hidden ${
          isCollapsed ? 'opacity-90 hover:opacity-100' : ''
        } ${className}`}
      >
        {/* Window Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-2 bg-gradient-to-r from-white to-slate-50/50 select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className={`w-8 h-8 rounded-lg ${iconBgClass} ${iconColorClass} flex items-center justify-center shrink-0 shadow-2xs`}>
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate tracking-tight">
                  {title}
                </h3>
                {badge}
              </div>
              {subtitle && !isCollapsed && (
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Window Controls & Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {headerAction && <div className="mr-1">{headerAction}</div>}

            {allowMaximize && (
              <button
                type="button"
                onClick={() => setIsMaximized(true)}
                title="Expand / Maximize Window"
                aria-label="Maximize window"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}

            {allowCollapse && (
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                title={isCollapsed ? 'Expand Window' : 'Minimize / Collapse Window'}
                aria-label={isCollapsed ? 'Expand Window' : 'Collapse Window'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {isCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-slate-600" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Window Content */}
        {!isCollapsed && <div className={bodyClassName}>{children}</div>}
      </div>

      {/* Maximized Fullscreen Overlay Modal */}
      {isMaximized && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {Icon && (
                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">{title}</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase">
                      Expanded View
                    </span>
                  </div>
                  {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {headerAction}
                <button
                  type="button"
                  onClick={() => setIsMaximized(false)}
                  title="Close Expanded View"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMaximized(false)}
                  title="Close Window"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 transition-colors cursor-pointer border border-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F8FAFC]">
              {maximizedContent || children}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
