"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiProviderError = void 0;
exports.userSafeAiError = userSafeAiError;
class AiProviderError extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
        this.name = 'AiProviderError';
    }
}
exports.AiProviderError = AiProviderError;
function userSafeAiError(error) {
    const code = error instanceof AiProviderError ? error.code : typeof error === 'string' ? error : '';
    if (code === 'AUTH')
        return 'Kraxx AI is not configured for this server.';
    if (code === 'RATE_LIMITED')
        return 'Kraxx AI is busy right now. Try again shortly.';
    if (code === 'TIMEOUT')
        return 'Kraxx AI timed out. Please try again.';
    return 'Kraxx AI is temporarily unavailable. Please try again.';
}
