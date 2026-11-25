"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHEDULER_RETRY_MAX_MS = exports.SCHEDULER_RETRY_BASE_MS = exports.SCHEDULER_LEASE_MS = void 0;
exports.retryDecision = retryDecision;
exports.deliveryFailurePolicy = deliveryFailurePolicy;
exports.safeDeliveryError = safeDeliveryError;
exports.SCHEDULER_LEASE_MS = 5 * 60 * 1000;
exports.SCHEDULER_RETRY_BASE_MS = 30 * 1000;
exports.SCHEDULER_RETRY_MAX_MS = 15 * 60 * 1000;
/** Attempts are counted when a worker acquires a lease. */
function retryDecision(attempts, maxAttempts, retryingStatus, now, failure = {}) {
    if (failure.permanent || attempts >= maxAttempts)
        return { status: 'FAILED', nextAttemptAt: null };
    const exponent = Math.max(0, Math.min(attempts - 1, 30));
    const delay = Math.min(exports.SCHEDULER_RETRY_BASE_MS * (2 ** exponent), exports.SCHEDULER_RETRY_MAX_MS);
    return { status: retryingStatus, nextAttemptAt: new Date(now.getTime() + Math.max(delay, failure.retryAfterMs ?? 0)) };
}
/** Discord.js handles route buckets; if an HTTP rate-limit error escapes, honor its retry delay. */
function deliveryFailurePolicy(error) {
    if (typeof error !== 'object' || error === null)
        return {};
    const record = error;
    const status = typeof record.status === 'number' ? record.status : undefined;
    const retryAfter = typeof record.retryAfter === 'number' ? record.retryAfter : 0;
    return {
        permanent: status !== undefined && status >= 400 && status < 500 && status !== 429,
        retryAfterMs: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    };
}
/** Keep persisted diagnostics useful without storing raw Discord error text. */
function safeDeliveryError(error) {
    const name = typeof error === 'object' && error !== null && 'name' in error && typeof error.name === 'string'
        ? error.name
        : 'UnknownError';
    return /^[A-Za-z][A-Za-z0-9_]{0,59}$/.test(name) ? name : 'DeliveryError';
}
