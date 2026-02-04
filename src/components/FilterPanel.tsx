'use client';

import { useState } from 'react';
import styles from './FilterPanel.module.scss';

interface FilterPanelProps {
    onFilterChange: (filters: FilterValues) => void;
    initialFilters?: FilterValues;
}

export interface FilterValues {
    make?: string;
    model?: string;
    createdFrom?: string;
    createdTo?: string;
}

const CAMERA_MAKES = [
    { value: '', label: 'All Brands' },
    { value: 'Canon', label: 'Canon' },
    { value: 'Nikon', label: 'Nikon' },
    { value: 'Sony', label: 'Sony' },
    { value: 'Fujifilm', label: 'Fujifilm' },
    { value: 'Leica', label: 'Leica' },
    { value: 'Apple', label: 'Apple' },
];

export default function FilterPanel({ onFilterChange, initialFilters = {} }: FilterPanelProps) {
    const [filters, setFilters] = useState<FilterValues>(initialFilters);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleChange = (key: keyof FilterValues, value: string) => {
        const newFilters = { ...filters, [key]: value || undefined };
        setFilters(newFilters);
        onFilterChange(newFilters);
    };

    const clearFilters = () => {
        setFilters({});
        onFilterChange({});
    };

    const hasActiveFilters = Object.values(filters).some(v => v);

    return (
        <div className={styles.panel}>
            <button
                className={styles.toggleBtn}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                Filters
                {hasActiveFilters && <span className={styles.badge}>Active</span>}
                <svg
                    className={`${styles.chevron} ${isExpanded ? styles.chevronUp : ''}`}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {isExpanded && (
                <div className={styles.content}>
                    <div className={styles.filterGroup}>
                        <label className={styles.label}>Camera Brand</label>
                        <select
                            className={styles.select}
                            value={filters.make || ''}
                            onChange={(e) => handleChange('make', e.target.value)}
                        >
                            {CAMERA_MAKES.map(make => (
                                <option key={make.value} value={make.value}>
                                    {make.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.filterGroup}>
                        <label className={styles.label}>Camera Model</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={filters.model || ''}
                            onChange={(e) => handleChange('model', e.target.value)}
                            placeholder="e.g. EOS R5"
                        />
                    </div>

                    <div className={styles.filterGroup}>
                        <label className={styles.label}>Date Range</label>
                        <div className={styles.dateRange}>
                            <input
                                type="date"
                                className={styles.dateInput}
                                value={filters.createdFrom || ''}
                                onChange={(e) => handleChange('createdFrom', e.target.value)}
                            />
                            <span className={styles.dateSeparator}>to</span>
                            <input
                                type="date"
                                className={styles.dateInput}
                                value={filters.createdTo || ''}
                                onChange={(e) => handleChange('createdTo', e.target.value)}
                            />
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <button className={styles.clearBtn} onClick={clearFilters}>
                            Clear all filters
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
