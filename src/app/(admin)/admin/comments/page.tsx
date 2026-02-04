'use client';

import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    listAlbumComments, approveAlbumComment, deleteAlbumComment,
    type CommentItem,
} from '@/lib/admin/api';
import { Check, Trash2, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { toast } from "sonner";
import { t } from '@/lib/i18n';

export default function CommentsPage() {
    const [comments, setComments] = useState<CommentItem[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const pageSize = 20;
    const totalPages = Math.ceil(total / pageSize);

    // Delete confirm state
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const loadComments = useCallback(async (p: number) => {
        setLoading(true);
        try {
            const res = await listAlbumComments(p, statusFilter);
            setComments(res.results);
            setTotal(res.total);
            setPage(p);
        } catch (e) {
            console.error('Failed to load comments:', e);
            toast.error(t('admin_comments_load_failed'));
        }
        setLoading(false);
    }, [statusFilter]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadComments(1);
    }, [loadComments]);

    const handleApprove = async (id: string) => {
        try {
            await approveAlbumComment(id);
            toast.success(t('admin_comments_approve_success'));
            loadComments(page);
        } catch (e) {
            console.error('Failed to approve comment:', e);
            toast.error(t('admin_comments_approve_failed'));
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteAlbumComment(deleteId);
            toast.success(t('admin_comments_delete_success'));
            setDeleteId(null);
            loadComments(page);
        } catch (e) {
            console.error('Failed to delete comment:', e);
            toast.error(t('admin_comments_delete_failed'));
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{t('admin_comments_status_approved')}</span>;
            case 'pending':
                return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">{t('admin_comments_status_pending')}</span>;
            case 'spam':
                return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">{t('admin_comments_status_spam')}</span>;
            default:
                return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">{status}</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t('admin_comments_title')}</h1>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{t('admin_comments_status_label')}</span>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('admin_comments_status_all')}</SelectItem>
                                    <SelectItem value="pending">{t('admin_comments_status_pending')}</SelectItem>
                                    <SelectItem value="approved">{t('admin_comments_status_approved')}</SelectItem>
                                    <SelectItem value="spam">{t('admin_comments_status_spam')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <span className="text-sm text-muted-foreground">{t('admin_comments_total', { count: total })}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Comments List */}
            {loading ? (
                <div className="text-center py-20 text-muted-foreground">{t('common_loading')}</div>
            ) : comments.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>{t('admin_comments_empty')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {comments.map(comment => (
                        <Card key={comment.id}>
                            <CardContent className="pt-4 pb-4">
                                <div className="flex items-start gap-4">
                                    {/* Avatar */}
                                    <div className="shrink-0">
                                        {comment.avatar ? (
                                            <Image
                                                src={comment.avatar}
                                                alt=""
                                                width={40}
                                                height={40}
                                                className="w-10 h-10 rounded-full object-cover"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium">
                                                {comment.comment_author_name?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-sm">{comment.comment_author_name}</span>
                                            {getStatusBadge(comment.comment_status)}
                                            {comment.post_title && (
                                                <span className="text-xs text-muted-foreground truncate">
                                                    {t('admin_comments_on', { title: comment.post_title })}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground mb-2 space-x-2">
                                            <span>{comment.comment_author_email}</span>
                                            {comment.comment_author_url && (
                                                <a href={comment.comment_author_url} target="_blank" rel="noopener noreferrer"
                                                    className="text-primary hover:underline">{comment.comment_author_url}</a>
                                            )}
                                            <span>{new Date(comment.comment_date).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm whitespace-pre-wrap">{comment.comment_content}</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="shrink-0 flex items-center gap-1">
                                        {comment.comment_status !== 'approved' && (
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700"
                                                onClick={() => handleApprove(comment.id)} title={t('admin_comments_action_approve')}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button size="icon" variant="ghost"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => setDeleteId(comment.id)} title={t('admin_comments_action_delete')}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                    <Button variant="outline" size="sm" disabled={page <= 1}
                        onClick={() => loadComments(page - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm px-4">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages}
                        onClick={() => loadComments(page + 1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Delete Confirm */}
            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => { if (!open) setDeleteId(null); }}
                title={t('admin_comments_delete_title')}
                description={t('admin_comments_delete_desc')}
                onConfirm={handleDelete}
                confirmText={t('common_delete')}
                destructive
            />
        </div>
    );
}
