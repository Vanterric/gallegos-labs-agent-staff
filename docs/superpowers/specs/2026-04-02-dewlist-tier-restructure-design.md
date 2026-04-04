# DewList Tier Restructure — Spec

**Date:** 2026-04-02

## Goal

Replace DewList's binary Free/Pro model with a three-tier structure (Free, Focus, Pro) that gates the core differentiator (one-task-at-a-time view) behind a paid tier, introduces a mid-price entry point, and tightens the free tier to drive conversions. Replace the 30-day trial with a 3-day full-Pro trial for all new signups.

## Tier Structure

| | **Free** | **Focus** ($4/mo, $36/yr) | **Pro** ($8/mo, $72/yr, $150 lifetime) |
|---|---|---|---|
| Lists | 1 | 3 | Unlimited |
| Tasks per list | 5 | 5 | Unlimited |
| One-task-at-a-time view | No | Yes | Yes |
| AI task breakdown | No | No | Yes |
| AI follow-up questions | No | No | Yes |
| AI task polish | No | No | Yes |
| AI voice input | No | No | Yes |
| AI single task breakdown (swipe down) | No | No | Yes |
| Scheduled list resets | No | No | Yes |
| Task dependencies | Yes | Yes | Yes |
| Push notifications | Yes | Yes | Yes |
| Dark mode / themes | Yes | Yes | Yes |

### Pricing Summary

| Tier | Monthly | Yearly | Lifetime |
|---|---|---|---|
| Focus | $4 | $36 | N/A |
| Pro | $8 | $72 | $150 |

### Trial

- All new signups get **3 days of full Pro access** (time-based, no usage gate)
- After 3 days, the user downgrades to Free automatically
- Replaces both the 30-day trial and the first-100 users program
- Trial expiration check remains in `AuthContext.jsx` on app load, with a backend `/auth/downgrade` call

## Data Model Changes

### User Model (`back-end/models/User.js`)

**Replace:**
- `isPro: Boolean` (default `false`)

**With:**
- `tier: String` (enum: `'free'`, `'focus'`, `'pro'`, default: `'free'`)

**Update enum values for:**
- `proSubscriptionType: String` — new values: `'focus-monthly'`, `'focus-yearly'`, `'pro-monthly'`, `'pro-yearly'`, `'pro-lifetime'`

**Keep as-is:**
- `isLifeTimePro: Boolean` — still needed for lifetime Pro users
- `proExpiresAt: Date` — still used for trial and subscription expiry
- `lastDatePaid: Date`
- `stripeSubscriptionId: String`
- `stripeCustomerId: String`

**Remove:**
- `isFirstHundredUser: Boolean` — no longer needed; all users get the same 3-day trial

### Migration

- Existing users with `isPro: true` and an active Stripe subscription → `tier: 'pro'`
- Existing users with `isPro: true` and `isLifeTimePro: true` → `tier: 'pro'`
- Existing users with `isPro: true` and unexpired trial (no Stripe subscription) → keep `tier: 'pro'` with existing `proExpiresAt`
- Existing users with `isPro: false` → `tier: 'free'`
- Write a one-time migration script, run it before deploying the new code

## Backend Changes (`back-end/index.js`)

### Tier Helper Functions

Add at the top of the file (or extract to a `utils/tier.js`):

```js
function canUseOneTaskView(user) {
  return user.tier === 'focus' || user.tier === 'pro';
}

function canUseAI(user) {
  return user.tier === 'pro';
}

function getMaxLists(user) {
  if (user.tier === 'pro') return Infinity;
  if (user.tier === 'focus') return 3;
  return 1; // free
}

function getMaxTasksPerList(user) {
  if (user.tier === 'pro') return Infinity;
  return 5; // free and focus
}
```

### Endpoint Changes

**List creation (line ~723):**
- Replace `!user.isPro && count >= 3` with `count >= getMaxLists(user)`

**Task creation (line ~802):**
- Replace `!user.isPro && taskCount >= 5` with `taskCount >= getMaxTasksPerList(user)`

**AI endpoints (lines ~985, 1019, 1055, 1087, 1123):**
- Replace `!user.isPro` with `!canUseAI(user)`

**Scheduled resets (`cron.js`):**
- Gate reset execution behind `user.tier === 'pro'`

**User signup (lines ~370-393, 432-451):**
- Remove `isFirstHundredUser` logic
- All new users: set `tier: 'pro'`, `proExpiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000`
- Referral bonus: still stacks (adds 3 more days on top of the 3-day trial = 6 days total)

**Downgrade endpoint (`/auth/downgrade`, line ~533):**
- Change from `isPro: false` to `tier: 'free'`

**User response (`/user`, line ~655):**
- Replace `isPro` with `tier` in the response object
- Remove `isFirstHundredUser` from response

### Stripe Changes

**New Stripe Price IDs needed (create in Stripe Dashboard):**
- Focus Monthly: $4/mo (test + production)
- Focus Yearly: $36/yr (test + production)
- Pro Monthly: $8/mo (test + production)
- Pro Yearly: $72/yr (test + production)

**Update `priceMap` (line ~895):**
```js
const priceMap = process.env.ENVIRONMENT === 'dev'
  ? {
      'focus-monthly': 'price_FOCUS_MONTHLY_TEST',
      'focus-yearly': 'price_FOCUS_YEARLY_TEST',
      'pro-monthly': 'price_PRO_MONTHLY_TEST',
      'pro-yearly': 'price_PRO_YEARLY_TEST',
    }
  : {
      'focus-monthly': 'price_FOCUS_MONTHLY_PROD',
      'focus-yearly': 'price_FOCUS_YEARLY_PROD',
      'pro-monthly': 'price_PRO_MONTHLY_PROD',
      'pro-yearly': 'price_PRO_YEARLY_PROD',
    };
```

**Update `amountMap` (line ~864):**
```js
const amountMap = {
  'pro-lifetime': 15000, // $150
};
```

**Webhook handler updates:**
- `checkout.session.completed`: Determine tier from the price ID and set `tier` accordingly
- `invoice.payment_succeeded`: Same — resolve tier from price ID
- `customer.subscription.deleted`: Set `tier: 'free'` instead of `isPro: false`
- `customer.subscription.updated`: Handle plan switching between Focus and Pro (update `tier` field)

## Frontend Changes

### AuthContext (`front-end/src/context/AuthContext.jsx`)

- Replace `user.isPro` with `user.tier`
- Trial expiration check (lines 21-44): on expiry, set `tier: 'free'` instead of `isPro: false`
- Remove `isFirst100User` state and related logic
- Add tier helper functions (same as backend) or export them from a shared `utils/tier.js`

### HomePage (`front-end/src/pages/home/HomePage.jsx`)

**One-task-at-a-time view gating:**
- Default `viewType` for free users: always `'list'` (override localStorage default)
- Toggle button (line ~1327): if `!canUseOneTaskView(user)`, show upgrade modal instead of toggling
- When trial expires and user is free, force `viewType` to `'list'`

**Limit checks:**
- Task limit (line ~1314): replace `!user.isPro` with tier-aware `getMaxTasksPerList(user)` check
- List limit (line ~1425): replace `!user.isPro` with tier-aware `getMaxLists(user)` check

**AI feature checks (line ~428, 1305):**
- Replace `user.isPro` with `canUseAI(user)`

**First-100 banner (lines ~178-190, 838-849):**
- Remove entirely

### Sidebar (`front-end/src/components/Sidebar.jsx`)

- Reset schedule button (line ~440): gate behind `user.tier === 'pro'`

### UpgradePromptModal (`front-end/src/components/UpgradePromptModal.jsx`)

**Context-aware messaging:**
- When triggered by list limit or one-task toggle → mention Focus tier ($4/mo) as primary CTA, Pro as upsell
- When triggered by AI feature → mention Pro tier ($8/mo) as primary CTA
- Update copy and button text accordingly

### SubscribePage (`front-end/src/pages/subscribe/SubscribePage.jsx`)

**Complete redesign of plan selection:**

Three-column layout:

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│     Free     │  │    Focus     │  │     Pro      │
│              │  │              │  │  BEST VALUE  │
│  1 list      │  │  3 lists     │  │  Unlimited   │
│  5 tasks     │  │  5 tasks     │  │  Unlimited   │
│  List view   │  │  One-task    │  │  One-task    │
│              │  │  view        │  │  AI features │
│              │  │              │  │  Resets      │
│  Current     │  │  $4/mo       │  │  $8/mo       │
│  Plan        │  │  $36/yr      │  │  $72/yr      │
│              │  │              │  │  $150 forever │
│              │  │ [Subscribe]  │  │ [Subscribe]  │
└──────────────┘  └──────────────┘  └──────────────┘
```

- Monthly/yearly toggle for Focus and Pro
- Lifetime option only on Pro
- Highlight the user's current tier
- If user is on Focus, Pro column says "Upgrade"
- If user is on Pro, show "Current Plan" on Pro

**Checkout flow:**
- Focus monthly/yearly → Stripe Checkout (same as current monthly/yearly flow)
- Pro monthly/yearly → Stripe Checkout
- Pro lifetime → inline CardElement (same as current lifetime flow)

### Settings Page

- Show current tier name and subscription details
- "Manage Subscription" links to Stripe Customer Portal (existing)
- If on Focus, show upsell to Pro

## What This Does Not Include

- App Store submission (separate initiative)
- Refactoring the monolithic backend into routes/services
- Adding tests
- Changing the referral program structure (still gives bonus trial days)
- Analytics/tracking for tier conversion rates

## Files Changed

| File | Change |
|---|---|
| `back-end/models/User.js` | Replace `isPro` with `tier`, remove `isFirstHundredUser`, update `proSubscriptionType` enum |
| `back-end/index.js` | Add tier helpers, update all gating checks, update Stripe price maps, update webhooks, update signup logic, update downgrade endpoint |
| `back-end/cron.js` | Gate scheduled resets behind `tier === 'pro'` |
| `front-end/src/context/AuthContext.jsx` | Replace `isPro` with `tier`, remove first-100 state, update expiry logic |
| `front-end/src/pages/home/HomePage.jsx` | Gate one-task view, update limit checks, update AI checks, remove first-100 banner |
| `front-end/src/components/Sidebar.jsx` | Update reset schedule gate |
| `front-end/src/components/UpgradePromptModal.jsx` | Context-aware tier messaging |
| `front-end/src/pages/subscribe/SubscribePage.jsx` | Three-tier layout, new plan definitions, new checkout flows |
| `front-end/src/SubscribeWrapper.jsx` | No changes expected |
| New: `scripts/migrate-tiers.js` | One-time migration script for existing users |
