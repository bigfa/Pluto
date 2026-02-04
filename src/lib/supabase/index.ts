/**
 * Supabase 集成模块
 *
 * 这个模块提供了 Supabase 的完整功能集成，包括：
 * - 认证（Auth）
 * - 存储（Storage）
 * - 实时订阅（Realtime）
 * - 数据库（通过 Drizzle ORM）
 */

// 客户端
export {
    createSupabaseClient,
    createSupabaseAdminClient,
    getSupabase,
    type SupabaseConfig,
} from './client';

// 认证
export {
    signUp,
    signIn,
    signInWithMagicLink,
    signInWithOAuth,
    signOut,
    getCurrentUser,
    getSession,
    updateUser,
    resetPassword,
    onAuthStateChange,
    type SignUpCredentials,
    type SignInCredentials,
    type AuthResponse,
} from './auth';

// 存储
export {
    uploadFile,
    getPublicUrl,
    getSignedUrl,
    deleteFile,
    listFiles,
    createBucket,
    STORAGE_BUCKETS,
    type StorageBucket,
} from './storage';

// 实时
export {
    subscribeToTable,
    subscribeToMediaLikes,
    subscribeToAlbumComments,
    subscribeToAlbumViews,
    broadcastMessage,
    subscribeToBroadcast,
    trackPresence,
    unsubscribe,
    type DatabaseChange,
    type SubscribeOptions,
} from './realtime';
