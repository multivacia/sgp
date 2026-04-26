export function asyncRoute(fn) {
    return (req, res, next) => {
        void Promise.resolve(fn(req, res, next)).catch(next);
    };
}
//# sourceMappingURL=asyncRoute.js.map