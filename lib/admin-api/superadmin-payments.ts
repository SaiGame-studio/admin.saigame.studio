import { api } from "@/lib/api-client";

export interface SPackage {
    id: string;
    package_key: string;
    name: string;
    description: string;
    scoin_amount: number;
    bonus_scoin: number;
    price_amount: number;
    price_currency: string;
    is_active: boolean;
    is_featured: boolean;
    sort_order: number;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface SGemPackage {
    id: string;
    package_key: string;
    name: string;
    description: string;
    sgem_amount: number;
    price_amount: number;
    price_currency: string;
    prices: Record<string, number>;
    is_active: boolean;
    available_from: string | null;
    available_until: string | null;
    sort_order: number;
    metadata: Record<string, unknown>;
    deleted_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface SPackagesResult {
    packages: SPackage[];
}

export interface SGemPackagesResult {
    packages: SGemPackage[];
}

export interface CreateSGemPackageBody {
    package_key: string;
    name: string;
    description: string;
    sgem_amount: number;
    price_amount: number;
    price_currency: string;
    prices?: Record<string, number>;
    is_active: boolean;
    available_from?: string | null;
    available_until?: string | null;
    sort_order: number;
    metadata?: Record<string, unknown>;
}

export interface UpdateSGemPackageBody {
    package_key?: string;
    name?: string;
    description?: string;
    sgem_amount?: number;
    price_amount?: number;
    price_currency?: string;
    prices?: Record<string, number>;
    is_active?: boolean;
    available_from?: string | null;
    available_until?: string | null;
    sort_order?: number;
    metadata?: Record<string, unknown>;
}

export interface CreateSPackageBody {
    package_key: string;
    name: string;
    description: string;
    scoin_amount: number;
    bonus_scoin: number;
    price_amount: number;
    price_currency: string;
    is_active: boolean;
    is_featured: boolean;
    sort_order: number;
    metadata: Record<string, unknown>;
}

export interface UpdateSPackageBody {
    name?: string;
    description?: string;
    scoin_amount?: number;
    bonus_scoin?: number;
    price_amount?: number;
    price_currency?: string;
    is_active?: boolean;
    is_featured?: boolean;
    sort_order?: number;
    metadata?: Record<string, unknown>;
}

export interface LLMTokenPackage {
    id: string;
    package_key: string;
    tokens: number;
    sgem_cost: number;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface LLMTokenPackagesResult {
    packages: LLMTokenPackage[];
}

export interface CreateLLMTokenPackageBody {
    package_key: string;
    tokens: number;
    sgem_cost: number;
    is_active: boolean;
    sort_order: number;
}

export interface PaymentMethodConfig {
    id: string;
    provider_key: string;
    display_name: string;
    description: string;
    icon_url: string;
    is_active: boolean;
    supports_subscription: boolean;
    config: Record<string, unknown>;
    webhook_endpoint_suffix: string;
    sort_order: number;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface PaymentMethodsResult {
    methods: PaymentMethodConfig[];
}

export async function listSPackages(): Promise<SPackagesResult> {
    return api.get("/api/v1/superadmin/payment/packages");
}

export async function getSPackage(id: string): Promise<SPackage> {
    return api.get(`/api/v1/superadmin/payment/packages/${id}`);
}

export async function createSPackage(body: CreateSPackageBody): Promise<SPackage> {
    return api.post("/api/v1/superadmin/payment/packages", body);
}

export async function updateSPackage(id: string, body: UpdateSPackageBody): Promise<SPackage> {
    return api.patch(`/api/v1/superadmin/payment/packages/${id}`, body);
}

export async function deleteSPackage(id: string): Promise<void> {
    return api.delete(`/api/v1/superadmin/payment/packages/${id}`);
}

export async function listSGemPackagesAdmin(): Promise<SGemPackagesResult> {
    return api.get("/api/v1/superadmin/payment/sgem-packages");
}

export async function getSGemPackageAdmin(id: string): Promise<SGemPackage> {
    return api.get(`/api/v1/superadmin/payment/sgem-packages/${id}`);
}

export async function createSGemPackage(body: CreateSGemPackageBody): Promise<SGemPackage> {
    return api.post("/api/v1/superadmin/payment/sgem-packages", body);
}

export async function updateSGemPackage(id: string, body: UpdateSGemPackageBody): Promise<SGemPackage> {
    return api.patch(`/api/v1/superadmin/payment/sgem-packages/${id}`, body);
}

export async function deleteSGemPackage(id: string): Promise<void> {
    return api.delete(`/api/v1/superadmin/payment/sgem-packages/${id}`);
}

export async function getSGemPackage(id: string): Promise<SGemPackage> {
    const res: {
        package: SGemPackage;
    } = await api.get(`/api/v1/payments/sgem-packages/${id}`);
    return res.package;
}

export async function listLLMTokenPackages(): Promise<LLMTokenPackagesResult> {
    return api.get("/api/v1/admin/llm-token-packages");
}

export async function getLLMTokenPackage(id: string): Promise<LLMTokenPackage> {
    const res: {
        package: LLMTokenPackage;
    } = await api.get(`/api/v1/admin/llm-token-packages/${id}`);
    return res.package;
}

export async function updateLLMTokenPackage(
    id: string,
    body: {
        package_key?: string;
        tokens?: number;
        sgem_cost?: number;
        is_active?: boolean;
        sort_order?: number;
    },
): Promise<LLMTokenPackage> {
    return api.patch(`/api/v1/admin/llm-token-packages/${id}`, body);
}

export async function createLLMTokenPackage(body: CreateLLMTokenPackageBody): Promise<LLMTokenPackage> {
    return api.post("/api/v1/admin/llm-token-packages", body);
}

export async function listPaymentMethods(): Promise<PaymentMethodsResult> {
    return api.get("/api/v1/superadmin/payment/methods");
}

export async function getPaymentMethod(id: string): Promise<PaymentMethodConfig> {
    return api.get(`/api/v1/superadmin/payment/methods/${id}`);
}

export async function updatePaymentMethod(
    id: string,
    body: {
        display_name?: string;
        description?: string;
        icon_url?: string;
        is_active?: boolean;
        supports_subscription?: boolean;
        config?: Record<string, unknown>;
        webhook_endpoint_suffix?: string;
        sort_order?: number;
    },
): Promise<PaymentMethodConfig> {
    return api.patch(`/api/v1/superadmin/payment/methods/${id}`, body);
}
