/**
 * RAG chunk: Token quota system.
 * Injected when the user asks about tokens, limits, 402 errors, purchasing, or running out.
 */
export const KEYWORDS = [
    'token', 'quota', 'balance', 'free token', 'premium token', 'run out', 'exhausted',
    '402', 'payment required', 'top up', 'buy token', 'token limit', 'usage',
    'hết token', 'token quota', 'mua token', 'nạp token', 'giới hạn token',
];
export const INTENT_TYPES: string[] = [];
export const DOC = `
# Token Quota System

## Two Token Pools
Every game has two separate token pools for LLM usage:

| Pool | Source | Priority |
|---|---|---|
| **Premium** | Purchased by the studio | Used **first** |
| **Free** | Provided by platform on game creation | Used when premium is exhausted |

When both pools reach 0, all AI generation requests return **HTTP 402 Payment Required**.

## How Tokens Are Consumed
- Every AI request (detect-intent + generation) consumes tokens.
- The system tracks both **input tokens** (your prompt + context) and **output tokens** (AI response).
- Tokens are deducted after a successful response based on actual usage.
- A small amount may be **reserved** during an in-flight request and then settled.

## Checking Token Balance
Go to your game settings or the token stats panel to see:
- `free_tokens_remaining` � how many free tokens are left
- `premium_tokens_remaining` � how many premium tokens are left
- `free_tokens_used` / `premium_tokens_used` � historical usage

## Getting More Tokens
- **Free tokens**: automatically provisioned. Contact platform admin to increase the free quota.
- **Premium tokens**: purchase through the platform's token purchase flow (LLM Token Purchase dialog).

## Token Quality Tiers
Premium tokens use higher-quality models (e.g. `gemini-2.5-flash`).
Free tokens use lighter models (e.g. `gemini-2.0-flash-lite`).
This means you may notice a quality difference in generated content when using free tokens.

## Why Is the AI Refusing My Request?
If you see a "quota exceeded" or 402 error:
1. Check your token balance in the game settings.
2. Purchase premium tokens if the free pool is empty.
3. If you believe the balance is wrong, contact the platform admin.
`;
