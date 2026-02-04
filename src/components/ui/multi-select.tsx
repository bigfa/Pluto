'use client';

import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
    value: string;
    label: string;
}

interface MultiSelectProps {
    options: MultiSelectOption[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    className?: string;
}

export function MultiSelect({ options, selected, onChange, placeholder = '选择...', className }: MultiSelectProps) {
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter(v => v !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const selectedLabels = options
        .filter(o => selected.includes(o.value))
        .map(o => o.label);

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
            >
                <span className="line-clamp-1 text-left flex-1">
                    {selectedLabels.length > 0 ? selectedLabels.join(', ') : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                </span>
                <ChevronDown className={cn('h-4 w-4 opacity-50 ml-2 shrink-0 transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                    <div className="p-1 max-h-60 overflow-y-auto">
                        {options.length === 0 ? (
                            <div className="py-2 px-3 text-sm text-muted-foreground">暂无选项</div>
                        ) : options.map(option => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => toggleOption(option.value)}
                                className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                            >
                                <div className={cn(
                                    'h-4 w-4 shrink-0 rounded-sm border border-primary flex items-center justify-center',
                                    selected.includes(option.value) && 'bg-primary text-primary-foreground'
                                )}>
                                    {selected.includes(option.value) && <Check className="h-3 w-3" />}
                                </div>
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
