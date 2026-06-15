"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.sanitizeUser = sanitizeUser;
exports.registerUser = registerUser;
exports.checkAvailability = checkAvailability;
exports.loginUser = loginUser;
exports.getUserById = getUserById;
exports.updateUserProfile = updateUserProfile;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const config_1 = require("../config");
const errorHandler_1 = require("../middleware/errorHandler");
const activity_service_1 = require("./activity.service");
const prisma = new client_1.PrismaClient();
function generateToken(user) {
    return jsonwebtoken_1.default.sign({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
    }, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.expiresIn });
}
function sanitizeUser(user) {
    const { password: _password, ...safeUser } = user;
    return safeUser;
}
async function registerUser(data) {
    const hashedPassword = await bcryptjs_1.default.hash(data.password, 12);
    const user = await prisma.user.create({
        data: {
            name: data.name,
            email: data.email.toLowerCase(),
            username: data.username.toLowerCase(),
            password: hashedPassword,
            phone: data.phone,
        },
    });
    const safeUser = sanitizeUser(user);
    const token = generateToken(safeUser);
    (0, activity_service_1.logActivity)({ userId: user.id, type: 'register', action: 'Cuenta creada' });
    return { token, user: safeUser };
}
async function checkAvailability(data) {
    const [emailUser, usernameUser] = await Promise.all([
        data.email ? prisma.user.findUnique({ where: { email: data.email.toLowerCase() } }) : null,
        data.username ? prisma.user.findUnique({ where: { username: data.username.toLowerCase() } }) : null,
    ]);
    return { emailTaken: !!emailUser, usernameTaken: !!usernameUser };
}
async function loginUser(data) {
    const identifier = data.email.toLowerCase();
    const user = await prisma.user.findFirst({
        where: { OR: [{ email: identifier }, { username: identifier }] },
    });
    if (!user) {
        throw new errorHandler_1.AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }
    const isPasswordValid = await bcryptjs_1.default.compare(data.password, user.password);
    if (!isPasswordValid) {
        throw new errorHandler_1.AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }
    if (user.isArchived) {
        throw new errorHandler_1.AppError('Cuenta eliminada', 403, 'ACCOUNT_ARCHIVED');
    }
    if (!user.isActive) {
        throw new errorHandler_1.AppError('Cuenta deshabilitada. Contacta al soporte.', 403, 'ACCOUNT_DISABLED');
    }
    const safeUser = sanitizeUser(user);
    const token = generateToken(safeUser);
    (0, activity_service_1.logActivity)({ userId: user.id, type: 'login', action: 'Inicio de sesión' });
    return { token, user: safeUser };
}
async function getUserById(id) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user)
        return null;
    return sanitizeUser(user);
}
async function updateUserProfile(id, data) {
    const updateData = {};
    if (data.name)
        updateData.name = data.name;
    if (data.phone)
        updateData.phone = data.phone;
    if (data.password) {
        updateData.password = await bcryptjs_1.default.hash(data.password, 12);
    }
    const user = await prisma.user.update({
        where: { id },
        data: updateData,
    });
    const actionType = data.password ? 'password_change' : 'profile_update';
    const actionLabel = data.password ? 'Contraseña actualizada' : 'Perfil actualizado';
    (0, activity_service_1.logActivity)({ userId: id, type: actionType, action: actionLabel });
    return sanitizeUser(user);
}
//# sourceMappingURL=auth.service.js.map