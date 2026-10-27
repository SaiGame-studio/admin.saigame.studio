/**
 * Shop currency helpers.
 *
 * Currency pickers store either an item definition ID or SGEM_CURRENCY_VALUE
 * in a single string. These helpers map that value to and from the API's
 * `currency_type` + `currency_item_def_id` fields.
 */
import type { ShopCurrencyType } from '@/lib/shop-admin-api';

/** Picker value that selects the platform sGem wallet. */
export const SGEM_CURRENCY_VALUE = '__sgem__';

export const SGEM_CURRENCY_LABEL = 'sGem';

/** Returns the picker value for a shop or shop item. */
export function toCurrencyPickerValue(entity: {
    currency_type?: ShopCurrencyType | null;
    currency_item_def_id?: string | null;
}): string {
    if (entity.currency_type === 'sgem') return SGEM_CURRENCY_VALUE;
    return entity.currency_item_def_id ?? '';
}

export function isSGemCurrency(value: string): boolean {
    return value === SGEM_CURRENCY_VALUE;
}

export function matchesSGemSearch(search: string): boolean {
    return SGEM_CURRENCY_LABEL.toLowerCase().includes(search.trim().toLowerCase());
}

/** PATCH payload for the shop-level currency. "" clears the item currency. */
export function toShopCurrencyPayload(value: string): {
    currency_type: ShopCurrencyType;
    currency_item_def_id?: string;
} {
    if (isSGemCurrency(value)) return { currency_type: 'sgem' };
    return { currency_type: 'item', currency_item_def_id: value.trim() };
}

/** Create payload fields for a shop item currency override ("" = inherit shop). */
export function toAddItemCurrencyPayload(value: string): {
    currency_type?: ShopCurrencyType;
    currency_item_def_id?: string;
} {
    if (isSGemCurrency(value)) return { currency_type: 'sgem' };
    return value.trim() ? { currency_item_def_id: value.trim() } : {};
}

/** PATCH payload fields for a shop item currency override ("" clears each field). */
export function toUpdateItemCurrencyPayload(value: string): {
    currency_type: ShopCurrencyType | '';
    currency_item_def_id: string;
} {
    if (isSGemCurrency(value)) return { currency_type: 'sgem', currency_item_def_id: '' };
    return { currency_type: '', currency_item_def_id: value.trim() };
}
