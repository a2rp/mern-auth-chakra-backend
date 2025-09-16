// admin: list users, create user, update user (name/email/role)

const { z } = require("zod");
const mongoose = require("mongoose");
const User = require("../models/user.model");

// strong password: ≥8 chars, 1 upper, 1 lower, 1 number, 1 special
const STRONG_PWD_RX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// query for list view
const listQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    q: z.string().trim().optional(),
});

// admin may change only these fields on update
const updateSchema = z
    .object({
        name: z.string().min(2).max(60).optional(),
        email: z.string().email().optional(),
        role: z.enum(["user", "admin"]).optional(),
    })
    .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

// payload for creating a new user (now enforces strong password)
const createSchema = z.object({
    name: z.string().min(2).max(60),
    email: z.string().email(),
    password: z
        .string()
        .min(8, "Min 8 characters")
        .regex(
            STRONG_PWD_RX,
            "Use upper & lower case letters, a number, and a special character"
        ),
    role: z.enum(["user", "admin"]).optional().default("user"),
});

// GET /api/admin/users
exports.listUsers = async (req, res, next) => {
    try {
        const { page, limit, q } = listQuerySchema.parse(req.query);

        const filter = {};
        if (q) {
            const rx = new RegExp(q, "i");
            filter.$or = [{ name: rx }, { email: rx }];
        }

        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            User.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select("name email role createdAt updatedAt")
                .lean(),
            User.countDocuments(filter),
        ]);

        const users = items.map((u) => ({
            id: u._id.toString(),
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
        }));

        res.json({
            ok: true,
            meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
            users,
        });
    } catch (err) {
        if (err.name === "ZodError") {
            return res
                .status(400)
                .json({
                    ok: false,
                    message: "Invalid query",
                    issues: err.errors,
                });
        }
        next(err);
    }
};

// POST /api/admin/users
exports.createUser = async (req, res, next) => {
    try {
        const data = createSchema.parse(req.body);

        // unique email
        const exists = await User.findOne({ email: data.email }).lean();
        if (exists)
            return res
                .status(409)
                .json({ ok: false, message: "Email already in use" });

        const user = await User.create({
            name: data.name,
            email: data.email,
            password: data.password, // model hook hashes it
            role: data.role,
        });

        res.status(201).json({
            ok: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    } catch (err) {
        if (err.name === "ZodError") {
            return res
                .status(400)
                .json({
                    ok: false,
                    message: "Invalid input",
                    issues: err.errors,
                });
        }
        if (err?.code === 11000) {
            return res
                .status(409)
                .json({ ok: false, message: "Email already in use" });
        }
        next(err);
    }
};

// PUT /api/admin/users/:id
exports.updateUser = async (req, res, next) => {
    try {
        const userId = req.params.id;
        if (!mongoose.isValidObjectId(userId)) {
            return res
                .status(400)
                .json({ ok: false, message: "Invalid user id" });
        }

        const data = updateSchema.parse(req.body);

        if (data.email) {
            const exists = await User.findOne({
                email: data.email,
                _id: { $ne: userId },
            }).lean();
            if (exists)
                return res
                    .status(409)
                    .json({ ok: false, message: "Email already in use" });
        }

        const updated = await User.findByIdAndUpdate(
            userId,
            { $set: data },
            { new: true, runValidators: true, context: "query" }
        ).select("name email role createdAt updatedAt");

        if (!updated)
            return res
                .status(404)
                .json({ ok: false, message: "User not found" });

        res.json({
            ok: true,
            user: {
                id: updated._id.toString(),
                name: updated.name,
                email: updated.email,
                role: updated.role,
                createdAt: updated.createdAt,
                updatedAt: updated.updatedAt,
            },
        });
    } catch (err) {
        if (err.name === "ZodError") {
            return res
                .status(400)
                .json({
                    ok: false,
                    message: "Invalid input",
                    issues: err.errors,
                });
        }
        if (err?.code === 11000) {
            return res
                .status(409)
                .json({ ok: false, message: "Email already in use" });
        }
        next(err);
    }
};
