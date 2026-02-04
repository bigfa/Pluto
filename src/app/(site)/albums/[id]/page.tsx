import AlbumDetailClient from './AlbumDetailClient';

interface PageProps {
    params: Promise<{ id: string }>;
}

// Metadata handled in layout.tsx

export default async function AlbumDetailPage({ params }: PageProps) {
    const { id } = await params;
    return <AlbumDetailClient id={id} />;
}
