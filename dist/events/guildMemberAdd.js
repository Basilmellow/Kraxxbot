"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onGuildMemberAdd = onGuildMemberAdd;
const onboarding_service_1 = require("../services/onboarding.service");
async function onGuildMemberAdd(member) {
    await onboarding_service_1.OnboardingService.handleMemberAdd(member);
}
