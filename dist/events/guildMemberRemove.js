"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onGuildMemberRemove = onGuildMemberRemove;
const onboarding_service_1 = require("../services/onboarding.service");
async function onGuildMemberRemove(member) {
    if (member.partial) {
        // Partial member — fetch if possible, then delegate
        try {
            const full = await member.fetch();
            await onboarding_service_1.OnboardingService.handleMemberRemove(full);
        }
        catch {
            // Member data unavailable (left before fetch) — silently skip
        }
        return;
    }
    await onboarding_service_1.OnboardingService.handleMemberRemove(member);
}
