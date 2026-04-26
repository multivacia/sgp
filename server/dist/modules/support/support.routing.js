function parseList(raw) {
    if (!raw)
        return [];
    return raw
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
}
function targetsForSeverity(env, severity) {
    const defaultEmail = parseList(env.supportRoutingDefaultEmail);
    const defaultWhatsapp = parseList(env.supportRoutingDefaultWhatsapp);
    const mediumEmail = parseList(env.supportRoutingMediumEmail);
    const highEmail = parseList(env.supportRoutingHighEmail);
    const highWhatsapp = parseList(env.supportRoutingHighWhatsapp);
    if (severity === 'HIGH' || severity === 'CRITICAL') {
        return {
            email: highEmail.length > 0 ? highEmail : defaultEmail,
            whatsapp: highWhatsapp.length > 0 ? highWhatsapp : defaultWhatsapp,
        };
    }
    return {
        email: mediumEmail.length > 0 ? mediumEmail : defaultEmail,
        whatsapp: [],
    };
}
export function resolveRoutingPlan(env, input) {
    const targets = targetsForSeverity(env, input.severity);
    return {
        items: [
            { channel: 'EMAIL', destinations: targets.email },
            { channel: 'WHATSAPP', destinations: targets.whatsapp },
        ],
    };
}
//# sourceMappingURL=support.routing.js.map