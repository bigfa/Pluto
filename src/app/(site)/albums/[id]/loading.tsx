import styles from './page.module.scss';

export default function Loading() {
    return (
        <div className={styles['album-detail']}>
            <div className={styles['album-detail__loading']}>Loading album...</div>
        </div>
    );
}
