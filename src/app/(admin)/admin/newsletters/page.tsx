'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    listNewsletters, createNewsletter, sendNewsletter as sendNewsletterApi,
    listAlbums, type NewsletterItem, type AlbumItem
} from '@/lib/admin/api';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Send, ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import { t } from '@/lib/i18n';

function AlbumSelector({ onSelect }: { onSelect: (album: AlbumItem) => void }) {
    const [albums, setAlbums] = useState<AlbumItem[]>([]);

    useEffect(() => {
        listAlbums(1, '').then(res => setAlbums(res.albums || []));
    }, []);

    return (
        <div className="space-y-2">
            <Label>{t('admin_newsletters_album_label')}</Label>
            <Select onValueChange={(val) => {
                const album = albums.find(a => a.id === val);
                if (album) onSelect(album);
            }}>
                <SelectTrigger>
                    <SelectValue placeholder={t('admin_newsletters_album_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                    {albums.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

export default function NewslettersPage() {
    const [newsletters, setNewsletters] = useState<NewsletterItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    // Create State
    const [open, setOpen] = useState(false);
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await listNewsletters(page);
            setNewsletters(res.newsletters || []);
            setTotal(res.total || 0);
        } catch (e) {
            console.error(e);
            toast.error(t('admin_newsletters_load_failed'));
        }
        setLoading(false);
    }, [page]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData();
    }, [loadData]);

    const handleCreateAndSend = async () => {
        if (!subject || !content) {
            toast.error(t('admin_newsletters_required'));
            return;
        }
        setSending(true);
        try {
            // First create the newsletter
            const createRes = await createNewsletter({ subject, content, type: 'general' });
            if (!createRes.ok || !createRes.newsletter) {
                toast.error(t('admin_newsletters_create_failed'));
                setSending(false);
                return;
            }

            // Then send it
            const sendRes = await sendNewsletterApi(createRes.newsletter.id);
            if (sendRes.ok) {
                toast.success(t('admin_newsletters_send_success', { count: sendRes.sent }));
                setOpen(false);
                setSubject('');
                setContent('');
                loadData();
            } else {
                toast.error(t('admin_newsletters_send_failed'));
            }
        } catch (e) {
            toast.error(t('admin_newsletters_send_failed_with_error', { error: String(e) }));
        }
        setSending(false);
    };

    const handleAlbumSelect = (album: AlbumItem) => {
        setSubject(t('admin_newsletters_album_subject', { title: album.title }));
        const albumHeading = t('admin_newsletters_album_heading', { title: album.title });
        const albumCta = t('admin_newsletters_album_cta');
        const html = `
<h2>${albumHeading}</h2>
${album.description ? `<p>${album.description}</p>` : ''}
<p>
    <a href="${typeof window !== 'undefined' ? window.location.origin : ''}/albums/${album.slug || album.id}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:4px;">
        ${albumCta}
    </a>
</p>
        `.trim();
        setContent(html);
    };

    const totalPages = Math.max(1, Math.ceil(total / 20));

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'sent': return t('admin_newsletters_status_sent');
            case 'sending': return t('admin_newsletters_status_sending');
            case 'draft': return t('admin_newsletters_status_draft');
            case 'failed': return t('admin_newsletters_status_failed');
            default: return status;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Mail className="h-6 w-6" />
                    <h1 className="text-2xl font-bold">{t('admin_newsletters_title')}</h1>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            {t('admin_newsletters_send')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>{t('admin_newsletters_dialog_title')}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <AlbumSelector onSelect={handleAlbumSelect} />
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">
                                        {t('admin_newsletters_or_manual')}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('admin_newsletters_subject_label')}</Label>
                                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder={t('admin_newsletters_subject_placeholder')} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('admin_newsletters_content_label')}</Label>
                                <Textarea
                                    className="min-h-[200px] font-mono text-sm"
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    placeholder={t('admin_newsletters_content_placeholder')}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('admin_newsletters_vars_hint')}
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>{t('common_cancel')}</Button>
                            <Button onClick={handleCreateAndSend} disabled={sending}>
                                <Send className="h-4 w-4 mr-2" />
                                {sending ? t('admin_newsletters_sending') : t('admin_newsletters_send_now')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('admin_newsletters_table_subject')}</TableHead>
                            <TableHead>{t('admin_newsletters_table_status')}</TableHead>
                            <TableHead>{t('admin_newsletters_table_recipients')}</TableHead>
                            <TableHead>{t('admin_newsletters_table_sent_at')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-10">
                                    {t('common_loading')}
                                </TableCell>
                            </TableRow>
                        )}
                        {!loading && newsletters.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                                    {t('admin_newsletters_empty')}
                                </TableCell>
                            </TableRow>
                        )}
                        {!loading && newsletters.map((n) => (
                            <TableRow key={n.id}>
                                <TableCell className="font-medium">{n.subject}</TableCell>
                                <TableCell>
                                    <Badge variant={n.status === 'sent' ? 'default' : 'outline'}>
                                        {getStatusLabel(n.status)}
                                    </Badge>
                                </TableCell>
                                <TableCell>{n.recipients_count || 0}</TableCell>
                                <TableCell className="text-muted-foreground">
                                    {n.sent_at ? new Date(n.sent_at).toLocaleString() : '-'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm px-4">
                        {page} / {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= totalPages || loading}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}
