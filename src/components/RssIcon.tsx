import React from 'react';

interface RssIconProps extends React.SVGProps<SVGSVGElement> {
    size?: number;
}

export default function RssIcon({ size = 16, ...props }: RssIconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <circle cx="6" cy="18" r="2" />
            <path d="M4 11a9 9 0 0 1 9 9" />
            <path d="M4 4a16 16 0 0 1 16 16" />
        </svg>
    );
}
