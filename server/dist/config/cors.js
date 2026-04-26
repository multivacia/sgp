export function corsOptions(origin) {
    return {
        origin,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Email'],
    };
}
//# sourceMappingURL=cors.js.map