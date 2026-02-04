'use client';

import { useState, useEffect, useCallback } from 'react';
import { listSubscribers, type SubscriberItem } from '@/lib/admin/api';
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
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { toast } from 'sonner';
import { t } from '@/lib/i18n';

export default function SubscribersPage() {
    const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await listSubscribers(page);
            setSubscribers(res.subscribers || []);
            setTotal(res.total || 0);
        } catch (e) {
            console.error(e);
            toast.error(t('admin_subscribers_load_failed'));
        }
        setLoading(false);
    }, [page]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData();
    }, [loadData]);

    const totalPages = Math.max(1, Math.ceil(total / 20));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Users className="h-6 w-6" />
                    <h1 className="text-2xl font-bold">{t('admin_subscribers_title')}</h1>
                </div>
                <div className="text-sm text-muted-foreground">
                    {t('admin_subscribers_total', { count: total })}
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('admin_subscribers_table_email')}</TableHead>
                            <TableHead>{t('admin_subscribers_table_status')}</TableHead>
                            <TableHead>{t('admin_subscribers_table_created')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-10">
                                    {t('common_loading')}
                                </TableCell>
                            </TableRow>
                        )}
                        {!loading && subscribers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                                    {t('admin_subscribers_empty')}
                                </TableCell>
                            </TableRow>
                        )}
                        {!loading && subscribers.map((sub) => (
                            <TableRow key={sub.id}>
                                <TableCell className="font-medium">{sub.email}</TableCell>
                                <TableCell>
                                    <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                                        {sub.status === 'active' ? t('admin_subscribers_status_active') : t('admin_subscribers_status_inactive')}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {new Date(sub.created_at).toLocaleString()}
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
