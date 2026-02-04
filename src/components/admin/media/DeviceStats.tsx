import { DeviceStats } from '@/lib/admin/api';
import { t } from '@/lib/i18n';

interface DeviceStatsProps {
    data: DeviceStats | null;
    loading: boolean;
    onRefresh: () => void;
}

export default function DeviceStatsPanel({ data, loading, onRefresh }: DeviceStatsProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t('admin_device_title')}</h2>
                <button
                    className="text-sm text-primary hover:underline"
                    onClick={onRefresh}
                    disabled={loading}
                >
                    {loading ? t('admin_device_loading') : t('admin_device_refresh')}
                </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-lg border bg-background p-4">
                    <h3 className="text-sm font-semibold mb-3">{t('admin_device_cameras')}</h3>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">{t('admin_device_loading')}</p>
                    ) : data?.cameras?.length ? (
                        <div className="space-y-2">
                            {data.cameras.map((camera, index) => (
                                <div key={`${camera.make || ''}-${camera.model || ''}-${index}`} className="flex items-center justify-between text-sm">
                                    <span className="truncate pr-3">
                                        {[camera.make, camera.model].filter(Boolean).join(' ') || t('admin_device_unknown_camera')}
                                    </span>
                                    <span className="text-muted-foreground">{camera.count}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">{t('admin_device_no_camera')}</p>
                    )}
                </section>

                <section className="rounded-lg border bg-background p-4">
                    <h3 className="text-sm font-semibold mb-3">{t('admin_device_lenses')}</h3>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">{t('admin_device_loading')}</p>
                    ) : data?.lenses?.length ? (
                        <div className="space-y-2">
                            {data.lenses.map((lens, index) => (
                                <div key={`${lens.model || ''}-${index}`} className="flex items-center justify-between text-sm">
                                    <span className="truncate pr-3">{lens.model || t('admin_device_unknown_lens')}</span>
                                    <span className="text-muted-foreground">{lens.count}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">{t('admin_device_no_lens')}</p>
                    )}
                </section>
            </div>
        </div>
    );
}
