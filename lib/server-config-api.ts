import { api } from './api-client';
export interface ServerConfig {
    features: {
        registration_enabled: boolean;
        referral_code_required: boolean;
    };
}
export async function fetchServerConfig(): Promise<ServerConfig> {
    return api.get('/api/v1/server/config', { requireAuth: false });
}
