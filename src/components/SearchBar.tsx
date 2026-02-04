'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
    onSearch: (query: string) => void;
    placeholder?: string;
    initialValue?: string;
}

export default function SearchBar({
    onSearch,
    placeholder = 'Search photos...',
    initialValue = ''
}: SearchBarProps) {
    const [value, setValue] = useState(initialValue);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        onSearch(value.trim());
    }, [value, onSearch]);

    const handleClear = useCallback(() => {
        setValue('');
        onSearch('');
    }, [onSearch]);

    return (
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={placeholder}
                    className="pl-9 pr-9"
                />
                {value && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={handleClear}
                        aria-label="Clear search"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <Button type="submit">Search</Button>
        </form>
    );
}
