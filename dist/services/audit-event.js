"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditDetails = createAuditDetails;
exports.assertAuditTenant = assertAuditTenant;
function createAuditDetails(event) {
    return JSON.stringify({
        outcome: event.outcome,
        source: event.source,
        targetType: event.targetType,
        data: event.metadata,
    });
}
function assertAuditTenant(event) {
    if (!event.guildId || !event.actorId)
        throw new Error('Audit tenant and actor are required.');
}
