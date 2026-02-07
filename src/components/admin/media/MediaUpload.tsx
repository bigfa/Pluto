import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { uploadMediaWithProgress, listProviders, type MediaCategory, type ProviderInfo } from '@/lib/admin/api';
import { toast } from "sonner";
import Image from 'next/image';
import { t } from '@/lib/i18n';

interface MediaUploadProps {
    categories: MediaCategory[];
    onUploadSuccess: () => void;
}

type QueuedFile = {
    id: string;
    file: File;
    signature: string;
    hash?: string;
    previewUrl: string;
    source: 'input' | 'paste';
};

const fileSignature = (file: File) => `${file.name}|${file.size}|${file.type}|${file.lastModified}`;

const computeFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

export default function MediaUpload({ categories, onUploadSuccess }: MediaUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
    const [uploadProvider, setUploadProvider] = useState('');
    const [uploadCategoryIds, setUploadCategoryIds] = useState<string[]>([]);
    const [uploadTags, setUploadTags] = useState('');
    const [providers, setProviders] = useState<ProviderInfo[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const queueRef = useRef<QueuedFile[]>([]);
    const optionalLabel = t('common_optional');
    const perFileProgress = useMemo(() => {
        if (!uploading || queuedFiles.length === 0) return [];
        const totalBytes = queuedFiles.reduce((sum, item) => sum + item.file.size, 0);
        if (totalBytes <= 0) return queuedFiles.map(() => 0);

        let remaining = Math.round((uploadProgress / 100) * totalBytes);
        return queuedFiles.map((item) => {
            const size = item.file.size || 1;
            const loaded = Math.min(Math.max(remaining, 0), size);
            remaining -= size;
            return Math.min(100, Math.round((loaded / size) * 100));
        });
    }, [uploading, queuedFiles, uploadProgress]);

    useEffect(() => {
        queueRef.current = queuedFiles;
    }, [queuedFiles]);

    useEffect(() => {
        return () => {
            queueRef.current.forEach((item) => {
                URL.revokeObjectURL(item.previewUrl);
            });
        };
    }, []);

    // Load available storage providers
    useEffect(() => {
        listProviders().then(res => {
            setProviders(res.providers);
            setUploadProvider(res.defaultProvider);
        }).catch(console.error);
    }, []);

    const appendFiles = useCallback(async (files: File[], source: 'input' | 'paste') => {
        if (files.length === 0) return;

        if (uploading) {
            toast.warning(t('admin_upload_busy'));
            return;
        }

        const items: Omit<QueuedFile, 'previewUrl'>[] = [];
        for (const file of files) {
            const signature = fileSignature(file);
            const hash = source === 'paste' ? await computeFileHash(file) : undefined;
            items.push({
                id: crypto.randomUUID(),
                file,
                signature,
                hash,
                source,
            });
        }

        const existing = queueRef.current;
        const existingSignatures = new Set(existing.map((item) => item.signature));
        const existingHashes = new Set(existing.map((item) => item.hash).filter(Boolean) as string[]);

        const deduped: QueuedFile[] = [];
        let duplicateCount = 0;

        for (const item of items) {
            if (existingSignatures.has(item.signature) || (item.hash && existingHashes.has(item.hash))) {
                duplicateCount += 1;
                continue;
            }
            existingSignatures.add(item.signature);
            if (item.hash) existingHashes.add(item.hash);
            deduped.push({
                ...item,
                previewUrl: URL.createObjectURL(item.file),
            });
        }

        if (deduped.length > 0) {
            setQueuedFiles((prev) => [...prev, ...deduped]);
        }

        if (duplicateCount > 0) {
            toast.warning(t('admin_upload_deduped', { count: duplicateCount }));
        }
        if (deduped.length > 0) {
            toast.success(t('admin_upload_added', { count: deduped.length }));
        }
    }, [uploading]);

    // Paste handler
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (!e.clipboardData || !e.clipboardData.items) return;

            const items = e.clipboardData.items;
            const files: File[] = [];

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) files.push(file);
                }
            }

            if (files.length > 0) {
                void appendFiles(files, 'paste');
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, [appendFiles]);

    const removeQueuedFile = useCallback((id: string) => {
        setQueuedFiles((prev) => {
            const target = prev.find((item) => item.id === id);
            if (target) {
                URL.revokeObjectURL(target.previewUrl);
            }
            return prev.filter((item) => item.id !== id);
        });
    }, []);

    const clearQueue = useCallback(() => {
        queueRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
        setQueuedFiles([]);
    }, []);

    const handleUpload = async () => {
        if (queuedFiles.length === 0) return;
        setUploading(true);
        setUploadProgress(0);
        let successCount = 0;
        let duplicateCount = 0;
        let failCount = 0;

        const formData = new FormData();
        for (const item of queuedFiles) {
            formData.append('files', item.file);
        }
        formData.append('provider', uploadProvider);
        if (uploadCategoryIds.length > 0) {
            formData.append('category_ids', uploadCategoryIds.join(','));
        }
        if (uploadTags) {
            formData.append('tags', uploadTags);
        }

        try {
            const result = await uploadMediaWithProgress(formData, setUploadProgress);
            successCount = result.successCount ?? result.data?.length ?? 0;
            duplicateCount = result.duplicateCount ?? 0;
            failCount = result.failCount ?? Math.max(0, queuedFiles.length - successCount - duplicateCount);
        } catch (e) {
            console.error('Upload failed:', e);
            failCount = queuedFiles.length;
        }

        setUploading(false);
        clearQueue();
        setUploadCategoryIds([]);
        setUploadTags('');
        setUploadProgress(0);

        // Reset file input
        const fileInput = document.getElementById('upload-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

        if (duplicateCount > 0) {
            toast.warning(t('admin_upload_duplicates', { count: duplicateCount }));
        }

        if (successCount > 0) {
            const message = failCount > 0
                ? t('admin_upload_success_with_fail', { success: successCount, fail: failCount })
                : t('admin_upload_success', { success: successCount });
            toast.success(message);
            onUploadSuccess();
        } else if (duplicateCount === 0) {
            toast.error(t('admin_upload_failed'));
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{t('admin_upload_title')}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4">
                    <div>
                        <Label>{t('admin_upload_category_label', { optional: optionalLabel })}</Label>
                        <MultiSelect
                            options={categories.map(c => ({ value: c.id, label: c.name }))}
                            selected={uploadCategoryIds}
                            onChange={setUploadCategoryIds}
                            placeholder={t('admin_upload_category_placeholder')}
                            className="mt-1"
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <Label htmlFor="upload-input">{t('admin_upload_choose_files')}</Label>
                            <Input
                                id="upload-input"
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={(e) => {
                                    const files = Array.from(e.target.files || []);
                                    void appendFiles(files, 'input');
                                    e.currentTarget.value = '';
                                }}
                                className="mt-1"
                            />
                        </div>
                        <div className="flex-1">
                            <Label>{t('admin_upload_tags_label', { optional: optionalLabel })}</Label>
                            <Input
                                value={uploadTags}
                                onChange={(e) => setUploadTags(e.target.value)}
                                placeholder={t('admin_upload_tags_placeholder')}
                                className="mt-1"
                            />
                        </div>
                        <div className="w-40">
                            <Label>{t('admin_upload_storage_label')}</Label>
                            <Select value={uploadProvider} onValueChange={setUploadProvider}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {providers.map(p => (
                                        <SelectItem key={p.value} value={p.value} disabled={!p.available}>
                                            {p.label}{!p.available ? t('admin_upload_provider_unavailable') : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleUpload} disabled={uploading || queuedFiles.length === 0}>
                            <Upload className="h-4 w-4 mr-1" />
                            {uploading ? t('common_uploading') : t('common_upload')}
                        </Button>
                    </div>
                    {queuedFiles.length > 0 && (
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{t('admin_upload_queue_hint', { count: queuedFiles.length })}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearQueue}
                                disabled={uploading}
                            >
                                {t('admin_upload_clear_queue')}
                            </Button>
                        </div>
                    )}
                    {queuedFiles.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                            {queuedFiles.map((item, index) => (
                                <div key={item.id} className="space-y-1">
                                    <div className="relative aspect-square overflow-hidden border bg-muted">
                                        <Image
                                            src={item.previewUrl}
                                            alt={item.file.name}
                                            fill
                                            sizes="(max-width: 768px) 45vw, 12vw"
                                            className="object-cover"
                                            unoptimized
                                        />
                                        {uploading && (
                                            <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white text-sm font-semibold">
                                                {perFileProgress[index] ?? 0}%
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            className="absolute top-1 right-1 rounded-full bg-black/70 text-white text-xs px-1.5 py-0.5"
                                            onClick={() => removeQueuedFile(item.id)}
                                            disabled={uploading}
                                            aria-label={t('admin_upload_remove_image')}
                                        >
                                            ×
                                        </button>
                                    </div>
                                    <div className="text-[11px] text-muted-foreground truncate" title={item.file.name}>
                                        {item.file.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {uploading && (
                        <div className="space-y-2">
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                            <div className="text-xs text-muted-foreground">{t('admin_upload_progress', { progress: uploadProgress })}</div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
