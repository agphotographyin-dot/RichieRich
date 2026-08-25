import React, { useState, useEffect, useRef } from 'react';
import { Search, History, Package, X, Sparkles, Check } from 'lucide-react';
import { InventoryItem } from '../../types';
import { CURRENCY } from '../../services/storage';

const HISTORY_KEY = 'rr_item_name_history';

export interface SelectedItemDetails {
  itemId: string;
  name: string;
  sku: string;
  category: string;
  unitPrice?: number;
  costPrice?: number;
  unit?: string;
  stockQuantity?: number;
  taxRate?: number;
}

interface ItemAutocompleteInputProps {
  value: string;
  placeholder?: string;
  inventory: InventoryItem[];
  onSelect: (item: SelectedItemDetails) => void;
  onChange?: (val: string) => void;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  required?: boolean;
}

export const ItemAutocompleteInput: React.FC<ItemAutocompleteInputProps> = ({
  value,
  placeholder = 'Type item name, SKU or pick from history...',
  inventory,
  onSelect,
  onChange,
  className = '',
  inputClassName = '',
  autoFocus = false,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [historyItems, setHistoryItems] = useState<string[]>([]);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal query when external value prop changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
        setHistoryItems(JSON.parse(saved));
      } else {
        // Seed default popular history items
        const initialHist = [
          'Royal Maghai Meetha Paan',
          'Signature Chocolate Fire Paan',
          'Sub-Zero Ice Smoke Paan',
          'Kesar Kasturi Gold Vark Paan',
          'Calcutta Sada Paan (100% Tobacco-Free)',
          'Royal Dark Roast Espresso Double Shot',
          'Richie Rich Chilled Hazelnut Cold Coffee (350ml)',
          'Royal Karak Saffron Masala Chai (Kulhad)',
          'Royal Rajwadi Shahi Mukhwas (200g Jar)',
          'Cool Mint Pocket Mouth Freshener Spray (15ml)',
          'Himalayan Natural Mineral Water (500ml Chilled)',
        ];
        localStorage.setItem(HISTORY_KEY, JSON.stringify(initialHist));
        setHistoryItems(initialHist);
      }
    } catch {
      setHistoryItems([]);
    }
  }, []);

  // Save item to history
  const saveToHistory = (name: string) => {
    if (!name || name.trim().length === 0) return;
    try {
      const trimmed = name.trim();
      const updated = [trimmed, ...historyItems.filter((h) => h.toLowerCase() !== trimmed.toLowerCase())].slice(0, 25);
      setHistoryItems(updated);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter matching inventory catalog items
  const cleanQ = query.trim().toLowerCase();

  const matchingCatalog = inventory.filter((item) => {
    if (!cleanQ) return true;
    return (
      item.name.toLowerCase().includes(cleanQ) ||
      item.sku.toLowerCase().includes(cleanQ) ||
      item.category.toLowerCase().includes(cleanQ) ||
      (item.tags && item.tags.some((t) => t.toLowerCase().includes(cleanQ)))
    );
  });

  // Filter matching previous history names
  const matchingHistory = historyItems.filter((h) => {
    if (!cleanQ) return true;
    return h.toLowerCase().includes(cleanQ);
  });

  // Combine items for keyboard navigation
  const allSuggestions: Array<{ type: 'catalog' | 'history'; data: any }> = [
    ...matchingCatalog.map((c) => ({ type: 'catalog' as const, data: c })),
    ...matchingHistory
      .filter((h) => !matchingCatalog.some((c) => c.name.toLowerCase() === h.toLowerCase()))
      .map((h) => ({ type: 'history' as const, data: h })),
  ];

  const handleSelectCatalogItem = (item: InventoryItem) => {
    setQuery(item.name);
    saveToHistory(item.name);
    setIsOpen(false);
    onSelect({
      itemId: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      unitPrice: item.sellingPrice,
      costPrice: item.costPrice,
      unit: item.unit,
      stockQuantity: item.stockQuantity,
      taxRate: item.taxRate,
    });
  };

  const handleSelectHistoryName = (histName: string) => {
    setQuery(histName);
    saveToHistory(histName);
    setIsOpen(false);

    // Check if matching in inventory
    const found = inventory.find((i) => i.name.toLowerCase() === histName.toLowerCase());
    if (found) {
      handleSelectCatalogItem(found);
    } else {
      // Custom item based on history
      const generatedSku = `SKU-${histName.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      onSelect({
        itemId: `custom-${Date.now()}`,
        name: histName,
        sku: generatedSku,
        category: 'Paan',
        costPrice: 25,
        unitPrice: 50,
        unit: 'pieces',
        stockQuantity: 100,
        taxRate: 5,
      });
    }
  };

  const handleSelectCustomTyped = () => {
    if (!query.trim()) return;
    const trimmed = query.trim();
    saveToHistory(trimmed);
    setIsOpen(false);

    const found = inventory.find((i) => i.name.toLowerCase() === trimmed.toLowerCase());
    if (found) {
      handleSelectCatalogItem(found);
    } else {
      const generatedSku = `SKU-${trimmed.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      onSelect({
        itemId: `custom-${Date.now()}`,
        name: trimmed,
        sku: generatedSku,
        category: 'Paan',
        costPrice: 30,
        unitPrice: 60,
        unit: 'pieces',
        stockQuantity: 100,
        taxRate: 5,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < allSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : allSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < allSuggestions.length) {
        const item = allSuggestions[highlightIndex];
        if (item.type === 'catalog') {
          handleSelectCatalogItem(item.data);
        } else {
          handleSelectHistoryName(item.data);
        }
      } else if (query.trim()) {
        handleSelectCustomTyped();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          required={required}
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (onChange) onChange(e.target.value);
            setIsOpen(true);
            setHighlightIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all ${inputClassName}`}
        />
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              if (onChange) onChange('');
              inputRef.current?.focus();
            }}
            className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Floating Suggestions Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[300px] max-w-[460px] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-72 flex flex-col">
          {/* Header info */}
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            <span>Search & Recent History</span>
            <span className="text-[9px] text-emerald-600 font-normal">Use ↑↓ keys & Enter</span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 p-1">
            {/* Custom Typed Option if user typed something new */}
            {query.trim().length > 0 && !inventory.some((i) => i.name.toLowerCase() === query.trim().toLowerCase()) && (
              <button
                type="button"
                onClick={handleSelectCustomTyped}
                className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-xs flex items-center justify-between group rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-semibold text-emerald-950">Use &quot;{query.trim()}&quot;</span>
                    <span className="block text-[10px] text-emerald-600">Add as new custom item to history</span>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">New</span>
              </button>
            )}

            {/* Catalog Matches */}
            {matchingCatalog.length > 0 && (
              <div className="p-1">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Package className="w-3 h-3 text-slate-400" />
                  <span>Product Catalog ({matchingCatalog.length})</span>
                </div>
                {matchingCatalog.slice(0, 8).map((item, idx) => {
                  const isHighlighted = highlightIndex === idx;
                  const isSelected = item.name.toLowerCase() === query.trim().toLowerCase();
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectCatalogItem(item)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        isHighlighted ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                            item.category === 'Paan'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.category === 'Cafe'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {item.category}
                        </span>
                        <div className="truncate">
                          <span className="font-semibold text-slate-900">{item.name}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({item.sku})</span>
                        </div>
                      </div>

                      <div className="text-right font-mono text-[11px] shrink-0 ml-2">
                        <span className="font-bold text-slate-900">{CURRENCY}{item.costPrice || item.sellingPrice}</span>
                        <span className="text-[10px] text-slate-400 block">Stock: {item.stockQuantity}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* History Suggestions */}
            {matchingHistory.length > 0 && (
              <div className="p-1">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <History className="w-3 h-3 text-slate-400" />
                  <span>Previous Search / History ({matchingHistory.length})</span>
                </div>
                {matchingHistory.slice(0, 6).map((histName, hIdx) => {
                  const actualIndex = matchingCatalog.length + hIdx;
                  const isHighlighted = highlightIndex === actualIndex;
                  return (
                    <button
                      key={hIdx}
                      type="button"
                      onClick={() => handleSelectHistoryName(histName)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        isHighlighted ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <History className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800 truncate">{histName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">History</span>
                    </button>
                  );
                })}
              </div>
            )}

            {matchingCatalog.length === 0 && matchingHistory.length === 0 && !query.trim() && (
              <div className="p-4 text-center text-xs text-slate-400">
                Type an item name or SKU to view suggestions
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
