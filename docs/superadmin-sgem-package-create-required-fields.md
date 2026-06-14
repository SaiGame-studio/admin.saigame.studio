# Super Admin sGem Package Create API - Required Fields Guide

This document lists the fields the front-end must send when creating an sGem package.

Backend references:
- Create handler: [`internal/handler/superadmin_payment_handler.go`](../../internal/handler/superadmin_payment_handler.go#L340-L388)
- Validation logic: [`internal/usecase/payment_usecase.go`](../../internal/usecase/payment_usecase.go#L258-L269)
- Write-time validation helpers: [`internal/usecase/payment_usecase.go`](../../internal/usecase/payment_usecase.go#L1437-L1509)

## Endpoint

`POST /api/v1/superadmin/payment/sgem-packages`

## Required fields

The following fields are required. If any of them is missing or invalid, the API returns `400 Bad Request`.

| Field | Type | Rule |
|------|------|------|
| `package_key` | string | Must not be empty after trimming whitespace |
| `name` | string | Must not be empty after trimming whitespace |
| `sgem_amount` | integer | Must be greater than `0` |
| `price_amount` | integer | Must be greater than `0` |
| `price_currency` | string | Must not be empty after trimming whitespace |

## Optional fields

These fields may be omitted when creating the package.

| Field | Type | Notes |
|------|------|------|
| `description` | string | Optional free-text description |
| `prices` | object | Optional currency price map; each value must be a positive integer |
| `is_active` | boolean | Defaults to `true` when omitted |
| `available_from` | string | Optional ISO-8601 datetime |
| `available_until` | string | Optional ISO-8601 datetime |
| `sort_order` | integer | Defaults to `0` when omitted |
| `metadata` | object | Optional JSON object |

## Recommended request body

```json
{
  "package_key": "sgem_2500_vnd",
  "name": "2,500 sGem - 625,000 VND",
  "description": "Starter bundle",
  "sgem_amount": 2500,
  "price_amount": 2500000,
  "price_currency": "VND",
  "prices": {
    "VND": 2500000,
    "USD": 999
  },
  "is_active": true,
  "available_from": null,
  "available_until": null,
  "sort_order": 20,
  "metadata": {}
}
```

## Validation behavior

- The handler trims `package_key`, `name`, and `price_currency` before validation.
- If `prices` is omitted, the backend stores an empty map.
- If `metadata` is omitted or empty, the backend stores `{}`.
- The backend rejects `prices` with more than 50 keys.
- The backend rejects metadata that exceeds the JSON key limit or field-length limit.

## Example error responses

### Missing required field

```json
{
  "error": "invalid request",
  "message": "package_key is required"
}
```

### Invalid amount

```json
{
  "error": "invalid request",
  "message": "sgem_amount must be greater than 0"
}
```

## Front-end checklist

- Trim whitespace before sending `package_key`, `name`, and `price_currency`.
- Block submit when any required field is empty.
- Only allow positive integers for `sgem_amount` and `price_amount`.
- Keep `prices` optional, but validate each currency amount if the editor is used.
- Send `metadata` as a valid JSON object, not a string.

