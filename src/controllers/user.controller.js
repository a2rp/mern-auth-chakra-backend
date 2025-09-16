// profile endpoints (me)
// - GET  /api/users/me           → return current user
// - PUT  /api/users/me           → update name/email
// - PUT  /api/users/me/password  → change password (verify current, set new)

const { z } = require("zod");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model");

// password strength: ≥8 chars, at least 1 upper, 1 lower, 1 number, 1 special
const STRONG_PWD_RX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

// allow updating basic profile fields
const updateMeSchema = z
    .object({
        name: z.string().min(2).max(60).optional(),
        email: z.string().email().optional(),
    })
    .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

// change-password payload (now with strong-password check)
const changePwdSchema = z
    .object({
        currentPassword: z.string().min(8, "Current password is required"),
        newPassword: z
            .string()
            .min(8, "Min 8 characters")
            .refine((v) => STRONG_PWD_RX.test(v), {
                message:
                    "Use upper & lower case letters, a number, and a special character",
                path: ["newPassword"],
            }),
    })
    .refine((v) => v.currentPassword !== v.newPassword, {
        path: ["newPassword"],
        message: "New password must be different from current",
    });

// GET /api/users/me
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId).select(
            "name email role createdAt updatedAt"
        );
        if (!user)
            return res
                .status(404)
                .json({ ok: false, message: "User not found" });

        res.json({
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
        next(err);
    }
};

// PUT /api/users/me
exports.updateMe = async (req, res, next) => {
    try {
        const data = updateMeSchema.parse(req.body);

        if (data.email) {
            const exists = await User.findOne({
                email: data.email,
                _id: { $ne: req.userId },
            }).lean();
            if (exists)
                return res
                    .status(409)
                    .json({ ok: false, message: "Email already in use" });
        }

        const updated = await User.findByIdAndUpdate(
            req.userId,
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
                id: updated.id,
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

// PUT /api/users/me/password
exports.changeMyPassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = changePwdSchema.parse(
            req.body
        );

        const user = await User.findById(req.userId).select("+password");
        if (!user)
            return res
                .status(404)
                .json({ ok: false, message: "User not found" });

        // verify current password
        let isMatch = false;
        if (typeof user.comparePassword === "function") {
            isMatch = await user.comparePassword(currentPassword);
        } else {
            isMatch = await bcrypt.compare(
                currentPassword,
                user.password || ""
            );
        }
        if (!isMatch) {
            return res
                .status(400)
                .json({ ok: false, message: "Current password is incorrect" });
        }

        // set and save (model hook will hash)
        user.password = newPassword;
        await user.save();

        res.json({ ok: true, message: "Password updated" });
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
        next(err);
    }
};
