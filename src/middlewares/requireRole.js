// allow only specific roles (e.g. admin)
// usage: router.get('/admin', requireAuth, requireRole('admin'), handler)
const User = require("../models/user.model");

function requireRole(...allowed) {
    return async function (req, res, next) {
        try {
            if (!req.userId) {
                return res
                    .status(401)
                    .json({ ok: false, message: "Not authenticated" });
            }

            // load role from DB (keeps things accurate if role changes)
            const me = await User.findById(req.userId).select("role");
            if (!me) {
                return res
                    .status(401)
                    .json({ ok: false, message: "User not found" });
            }

            if (!allowed.includes(me.role)) {
                return res
                    .status(403)
                    .json({ ok: false, message: "Forbidden" });
            }

            // stash for controllers if needed
            req.userRole = me.role;
            next();
        } catch (err) {
            next(err);
        }
    };
}

module.exports = requireRole;
