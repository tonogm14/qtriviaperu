"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFlaggedUsers = getFlaggedUsers;
exports.getSharedDevicesHandler = getSharedDevicesHandler;
exports.unflagUser = unflagUser;
exports.banUser = banUser;
exports.getUserDevices = getUserDevices;
const client_1 = require("@prisma/client");
const device_service_1 = require("../services/device.service");
const prisma = new client_1.PrismaClient();
async function getFlaggedUsers(req, res, next) {
    try {
        const users = await prisma.user.findMany({
            where: { isFlagged: true },
            select: {
                id: true,
                username: true,
                name: true,
                email: true,
                isFlagged: true,
                flagReason: true,
                isActive: true,
                isArchived: true,
                createdAt: true,
                devices: {
                    select: { deviceId: true, platform: true, firstSeenAt: true, lastSeenAt: true },
                    orderBy: { lastSeenAt: 'desc' },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
        res.json({ data: users });
    }
    catch (err) {
        next(err);
    }
}
async function getSharedDevicesHandler(req, res, next) {
    try {
        const data = await (0, device_service_1.getSharedDevices)();
        res.json({ data });
    }
    catch (err) {
        next(err);
    }
}
async function unflagUser(req, res, next) {
    try {
        const id = req.params['id'];
        const user = await prisma.user.update({
            where: { id },
            data: { isFlagged: false, flagReason: null },
            select: { id: true, username: true, isFlagged: true },
        });
        res.json({ data: user });
    }
    catch (err) {
        next(err);
    }
}
async function banUser(req, res, next) {
    try {
        const id = req.params['id'];
        const user = await prisma.user.update({
            where: { id },
            data: { isActive: false, isFlagged: true, flagReason: 'banned_by_admin' },
            select: { id: true, username: true, isActive: true },
        });
        res.json({ data: user });
    }
    catch (err) {
        next(err);
    }
}
async function getUserDevices(req, res, next) {
    try {
        const id = req.params['id'];
        const devices = await prisma.userDevice.findMany({
            where: { userId: id },
            orderBy: { lastSeenAt: 'desc' },
        });
        res.json({ data: devices });
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=fraud.controller.js.map