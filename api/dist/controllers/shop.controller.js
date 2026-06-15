"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProducts = listProducts;
exports.buyLives = buyLives;
exports.orderMerch = orderMerch;
exports.listPacksAdmin = listPacksAdmin;
exports.createPack = createPack;
exports.updatePack = updatePack;
exports.deletePack = deletePack;
exports.listMerchAdmin = listMerchAdmin;
exports.createMerch = createMerch;
exports.updateMerch = updateMerch;
exports.deleteMerch = deleteMerch;
exports.listOrders = listOrders;
exports.updateOrderStatus = updateOrderStatus;
exports.cartCheckout = cartCheckout;
exports.myOrders = myOrders;
exports.listLifeOrders = listLifeOrders;
exports.listVipEntries = listVipEntries;
exports.exportSales = exportSales;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const errorHandler_1 = require("../middleware/errorHandler");
const activity_service_1 = require("../services/activity.service");
const pushNotifications_1 = require("../services/pushNotifications");
const prisma = new client_1.PrismaClient();
// ─── Public: list products ────────────────────────────────────────────────────
async function listProducts(_req, res, next) {
    try {
        const [packs, merch] = await prisma.$transaction([
            prisma.lifePack.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
            prisma.merchItem.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
        ]);
        res.json({ data: { packs, merch } });
    }
    catch (err) {
        next(err);
    }
}
// ─── Buy lives ────────────────────────────────────────────────────────────────
const buyLivesSchema = zod_1.z.object({
    pack: zod_1.z.string(),
    method: zod_1.z.enum(['yape', 'plin', 'card']).default('yape'),
    quantity: zod_1.z.number().int().min(1).max(10).default(1),
});
async function buyLives(req, res, next) {
    try {
        const { pack: packId, method, quantity } = buyLivesSchema.parse(req.body);
        const userId = req.user.id;
        const pack = await prisma.lifePack.findUnique({ where: { id: packId } });
        if (!pack || !pack.active)
            throw new errorHandler_1.AppError('Pack no disponible', 404, 'NOT_FOUND');
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new errorHandler_1.AppError('User not found', 404, 'NOT_FOUND');
        const totalLives = pack.lives * quantity;
        const totalPrice = pack.price * quantity;
        const [updated] = await prisma.$transaction(async (tx) => {
            const seq = await tx.orderSeq.create({ data: {} });
            return Promise.all([
                tx.user.update({ where: { id: userId }, data: { lives: { increment: totalLives } } }),
                tx.lifeOrder.create({
                    data: { userId, packId, packLabel: pack.label, lives: pack.lives, quantity, price: totalPrice, method, orderNumber: seq.id },
                }),
            ]);
        });
        const qtyLabel = quantity > 1 ? `${quantity}× ` : '';
        await prisma.notification.create({
            data: {
                userId,
                type: 'life',
                title: '¡Vidas añadidas!',
                body: `Compraste ${qtyLabel}${pack.label} vía ${method.toUpperCase()} (S/${totalPrice.toFixed(2)}). ¡Buena suerte!`,
            },
        });
        (0, activity_service_1.logActivity)({ userId, type: 'buy_lives', action: `Compró ${totalLives} vidas vía ${method}`, meta: { packId, quantity, price: totalPrice } });
        res.json({ data: { lives: updated.lives, pack: packId, method, quantity, price: totalPrice } });
    }
    catch (err) {
        next(err);
    }
}
// ─── Order merch ──────────────────────────────────────────────────────────────
const orderMerchSchema = zod_1.z.object({
    itemId: zod_1.z.string(),
    method: zod_1.z.enum(['yape', 'plin', 'card']).default('yape'),
    quantity: zod_1.z.number().int().min(1).max(10).default(1),
    address: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
});
async function orderMerch(req, res, next) {
    try {
        const { itemId, method, quantity, address, phone } = orderMerchSchema.parse(req.body);
        const userId = req.user.id;
        const item = await prisma.merchItem.findUnique({ where: { id: itemId } });
        if (!item || !item.active)
            throw new errorHandler_1.AppError('Item no disponible', 404, 'NOT_FOUND');
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new errorHandler_1.AppError('User not found', 404, 'NOT_FOUND');
        if (item.stock !== -1) {
            if (item.stock < quantity)
                throw new errorHandler_1.AppError('Stock insuficiente', 400, 'OUT_OF_STOCK');
        }
        const total = item.price * quantity;
        let orderNumber;
        await prisma.$transaction(async (tx) => {
            const seq = await tx.orderSeq.create({ data: {} });
            orderNumber = seq.id;
            if (item.stock !== -1) {
                await tx.merchItem.update({ where: { id: itemId }, data: { stock: { decrement: quantity } } });
            }
            await tx.order.create({
                data: {
                    userId,
                    itemId,
                    quantity,
                    total,
                    method,
                    status: client_1.OrderStatus.PENDING,
                    orderNumber: seq.id,
                    address: address ?? user.phone ?? null,
                    phone: phone ?? user.phone ?? null,
                },
            });
            await tx.notification.create({
                data: {
                    userId,
                    type: 'merch',
                    title: '¡Pedido recibido!',
                    body: `${quantity}× ${item.name} vía ${method.toUpperCase()} (S/${total.toFixed(2)}). Te contactamos en menos de 24 h.`,
                },
            });
        });
        (0, activity_service_1.logActivity)({ userId, type: 'order_merch', action: `Ordenó ${quantity}× ${item.name} vía ${method}`, meta: { itemId, quantity, total } });
        res.json({ data: { itemId, quantity, method, total, orderNumber } });
    }
    catch (err) {
        next(err);
    }
}
// ─── Admin: CRUD life packs ───────────────────────────────────────────────────
const lifePackSchema = zod_1.z.object({
    lives: zod_1.z.number().int().min(1),
    price: zod_1.z.number().positive(),
    label: zod_1.z.string().min(1),
    tag: zod_1.z.string().optional().nullable(),
    active: zod_1.z.boolean().optional(),
    sortOrder: zod_1.z.number().int().optional(),
});
async function listPacksAdmin(_req, res, next) {
    try {
        const packs = await prisma.lifePack.findMany({ orderBy: { sortOrder: 'asc' } });
        res.json({ data: packs });
    }
    catch (err) {
        next(err);
    }
}
async function createPack(req, res, next) {
    try {
        const body = lifePackSchema.parse(req.body);
        const id = req.body.id ?? `pack_${Date.now()}`;
        const pack = await prisma.lifePack.create({ data: { id, ...body } });
        res.status(201).json({ data: pack });
    }
    catch (err) {
        next(err);
    }
}
async function updatePack(req, res, next) {
    try {
        const body = lifePackSchema.partial().parse(req.body);
        const pack = await prisma.lifePack.update({ where: { id: req.params['id'] }, data: body });
        res.json({ data: pack });
    }
    catch (err) {
        next(err);
    }
}
async function deletePack(req, res, next) {
    try {
        await prisma.lifePack.delete({ where: { id: req.params['id'] } });
        res.json({ data: { message: 'Deleted' } });
    }
    catch (err) {
        next(err);
    }
}
// ─── Admin: CRUD merch items ──────────────────────────────────────────────────
const merchItemSchema = zod_1.z.object({
    emoji: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    desc: zod_1.z.string().min(1),
    price: zod_1.z.number().positive(),
    stock: zod_1.z.number().int().min(-1).optional(),
    active: zod_1.z.boolean().optional(),
    sortOrder: zod_1.z.number().int().optional(),
    gradient: zod_1.z.string().optional(),
});
async function listMerchAdmin(_req, res, next) {
    try {
        const items = await prisma.merchItem.findMany({ orderBy: { sortOrder: 'asc' } });
        res.json({ data: items });
    }
    catch (err) {
        next(err);
    }
}
async function createMerch(req, res, next) {
    try {
        const body = merchItemSchema.parse(req.body);
        const id = req.body.id ?? `item_${Date.now()}`;
        const item = await prisma.merchItem.create({ data: { id, ...body } });
        res.status(201).json({ data: item });
    }
    catch (err) {
        next(err);
    }
}
async function updateMerch(req, res, next) {
    try {
        const body = merchItemSchema.partial().parse(req.body);
        const item = await prisma.merchItem.update({ where: { id: req.params['id'] }, data: body });
        res.json({ data: item });
    }
    catch (err) {
        next(err);
    }
}
async function deleteMerch(req, res, next) {
    try {
        await prisma.merchItem.delete({ where: { id: req.params['id'] } });
        res.json({ data: { message: 'Deleted' } });
    }
    catch (err) {
        next(err);
    }
}
// ─── Admin: orders ────────────────────────────────────────────────────────────
async function listOrders(req, res, next) {
    try {
        const status = req.query['status'];
        const userId = req.query['userId'];
        const where = {};
        if (status)
            where.status = status;
        if (userId)
            where.userId = userId;
        const [orders, summary] = await prisma.$transaction([
            prisma.order.findMany({
                where,
                orderBy: { createdAt: 'asc' },
                include: {
                    user: { select: { id: true, name: true, username: true, email: true, phone: true } },
                    item: { select: { id: true, name: true, emoji: true, price: true } },
                },
            }),
            prisma.order.groupBy({
                by: ['status'],
                _count: { id: true },
                _sum: { total: true },
                orderBy: { _count: { id: 'desc' } },
            }),
        ]);
        // Group by cartRef
        const STATUS_PRIORITY = ['PENDING', 'CONFIRMED', 'SHIPPED', 'CANCELLED', 'DELIVERED'];
        const groupMap = new Map();
        for (const order of orders) {
            const key = order.cartRef ?? order.id;
            if (!groupMap.has(key)) {
                groupMap.set(key, {
                    id: key,
                    orderNumber: order.orderNumber ?? null,
                    cartRef: order.cartRef ?? null,
                    method: order.method,
                    status: order.status,
                    address: order.address,
                    phone: order.phone ?? null,
                    recipientName: order.recipientName ?? null,
                    dni: order.dni ?? null,
                    notes: order.notes ?? null,
                    createdAt: order.createdAt,
                    updatedAt: order.updatedAt,
                    user: order.user,
                    items: [],
                    totalAmount: 0,
                });
            }
            const group = groupMap.get(key);
            if (order.orderNumber && !group.orderNumber)
                group.orderNumber = order.orderNumber;
            group.items.push({
                orderId: order.id,
                name: order.item.name,
                emoji: order.item.emoji,
                unitPrice: order.item.price,
                quantity: order.quantity,
                total: order.total,
            });
            group.totalAmount = parseFloat((group.totalAmount + order.total).toFixed(2));
            const curPri = STATUS_PRIORITY.indexOf(group.status);
            const newPri = STATUS_PRIORITY.indexOf(order.status);
            if (newPri !== -1 && (curPri === -1 || newPri < curPri))
                group.status = order.status;
        }
        const grouped = Array.from(groupMap.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json({ data: grouped, summary });
    }
    catch (err) {
        next(err);
    }
}
async function updateOrderStatus(req, res, next) {
    try {
        const { status, notes } = zod_1.z.object({
            status: zod_1.z.nativeEnum(client_1.OrderStatus),
            notes: zod_1.z.string().optional(),
        }).parse(req.body);
        // The :id may be a cartRef or an individual order id — resolve to individual order first
        const paramId = req.params['id'];
        const targetOrder = await prisma.order.findFirst({
            where: { OR: [{ id: paramId }, { cartRef: paramId }] },
        });
        if (!targetOrder)
            throw new errorHandler_1.AppError('Order not found', 404, 'NOT_FOUND');
        // If cartRef exists, update all orders in the group; otherwise just the one
        const cartRef = targetOrder.cartRef;
        const updateWhere = cartRef ? { cartRef } : { id: targetOrder.id };
        await prisma.order.updateMany({
            where: updateWhere,
            data: { status, ...(notes !== undefined ? { notes } : {}) },
        });
        // Reload one order for notification + response
        const order = await prisma.order.findUniqueOrThrow({
            where: { id: targetOrder.id },
            include: {
                user: { select: { id: true, name: true, username: true, email: true, phone: true } },
                item: { select: { id: true, name: true, emoji: true, price: true } },
            },
        });
        // Notify user on key status changes
        const statusNotifications = {
            [client_1.OrderStatus.CONFIRMED]: {
                title: '¡Pedido confirmado! ✅',
                body: `Tu pedido de ${order.item.name} ha sido confirmado y está siendo preparado.`,
            },
            [client_1.OrderStatus.SHIPPED]: {
                title: '¡Tu pedido está en camino! 📦',
                body: `Tu pedido de ${order.item.name} fue enviado. Llegará pronto.`,
            },
            [client_1.OrderStatus.DELIVERED]: {
                title: '¡Pedido entregado! 🎉',
                body: `Tu pedido de ${order.item.name} fue entregado. ¡Disfrútalo!`,
            },
            [client_1.OrderStatus.CANCELLED]: {
                title: 'Pedido cancelado ❌',
                body: `Tu pedido de ${order.item.name} fue cancelado.`,
            },
        };
        const notif = statusNotifications[status];
        if (notif) {
            await Promise.all([
                prisma.notification.create({
                    data: {
                        userId: order.userId,
                        type: 'merch',
                        title: notif.title,
                        body: notif.body,
                    },
                }),
                (0, pushNotifications_1.sendPushToUser)(order.userId, notif.title, notif.body, { orderId: order.id, status }),
            ]);
        }
        res.json({ data: order });
    }
    catch (err) {
        next(err);
    }
}
// ─── Cart checkout (mobile) ───────────────────────────────────────────────────
const cartCheckoutSchema = zod_1.z.object({
    items: zod_1.z.array(zod_1.z.object({
        itemId: zod_1.z.string(),
        quantity: zod_1.z.number().int().min(1).max(10),
    })).min(1),
    method: zod_1.z.enum(['yape', 'plin', 'card']).default('yape'),
    recipientName: zod_1.z.string().min(2),
    dni: zod_1.z.string().min(6),
    phone: zod_1.z.string().min(7),
    address: zod_1.z.string().min(5),
    notes: zod_1.z.string().optional(),
});
async function cartCheckout(req, res, next) {
    try {
        const { items, method, recipientName, dni, phone, address, notes } = cartCheckoutSchema.parse(req.body);
        const userId = req.user.id;
        // One sequence number for the whole cart
        const seq = await prisma.orderSeq.create({ data: {} });
        const orderNumber = seq.id;
        const cartRef = `CART-${orderNumber}`;
        const createdOrders = [];
        await prisma.$transaction(async (tx) => {
            for (const { itemId, quantity } of items) {
                const item = await tx.merchItem.findUnique({ where: { id: itemId } });
                if (!item || !item.active)
                    throw new errorHandler_1.AppError(`Item ${itemId} no disponible`, 404, 'NOT_FOUND');
                if (item.stock !== -1 && item.stock < quantity)
                    throw new errorHandler_1.AppError(`Stock insuficiente para ${item.name}`, 400, 'OUT_OF_STOCK');
                if (item.stock !== -1) {
                    await tx.merchItem.update({ where: { id: itemId }, data: { stock: { decrement: quantity } } });
                }
                const total = item.price * quantity;
                const order = await tx.order.create({
                    data: { userId, itemId, quantity, total, method, status: client_1.OrderStatus.PENDING, orderNumber: createdOrders.length === 0 ? orderNumber : null, address, phone, recipientName, dni, notes, cartRef },
                    include: { item: { select: { id: true, name: true, emoji: true, price: true } } },
                });
                createdOrders.push(order);
            }
            // Single combined notification
            const itemsSummary = createdOrders.map((o) => `${o.quantity}× ${o.item.name}`).join(', ');
            const grandTotal = createdOrders.reduce((s, o) => s + o.total, 0);
            await tx.notification.create({
                data: {
                    userId,
                    type: 'merch',
                    title: '¡Pedido recibido! 📦',
                    body: `${itemsSummary} — S/${grandTotal.toFixed(2)} vía ${method.toUpperCase()}. Te contactamos en menos de 24 h.`,
                },
            });
        });
        (0, activity_service_1.logActivity)({ userId, type: 'order_merch', action: `Carrito: ${createdOrders.length} items`, meta: { cartRef, orderNumber, items } });
        res.json({ data: { cartRef, orderNumber, orders: createdOrders.length } });
    }
    catch (err) {
        next(err);
    }
}
// ─── My orders (mobile — merch + lives) ──────────────────────────────────────
async function myOrders(req, res, next) {
    try {
        const userId = req.user.id;
        const [orders, lifeOrders, vipEntries] = await Promise.all([
            prisma.order.findMany({
                where: { userId },
                orderBy: { createdAt: 'asc' },
                include: { item: { select: { id: true, name: true, emoji: true, price: true } } },
            }),
            prisma.lifeOrder.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.gameEntry.findMany({
                where: { userId, game: { entryFee: { gt: 0 } } },
                orderBy: { joinedAt: 'desc' },
                select: {
                    id: true,
                    orderNumber: true,
                    gameId: true,
                    joinedAt: true,
                    game: { select: { id: true, title: true, entryFee: true, scheduledAt: true } },
                },
            }),
        ]);
        // Group merch orders by cartRef (cart checkout) or individual order id
        const STATUS_PRIORITY = ['PENDING', 'CONFIRMED', 'SHIPPED', 'CANCELLED', 'DELIVERED'];
        const groupMap = new Map();
        for (const order of orders) {
            const key = order.cartRef ?? order.id;
            if (!groupMap.has(key)) {
                groupMap.set(key, {
                    id: key,
                    orderNumber: order.orderNumber ?? null,
                    cartRef: order.cartRef ?? null,
                    method: order.method,
                    status: order.status,
                    address: order.address,
                    phone: order.phone ?? null,
                    recipientName: order.recipientName ?? null,
                    dni: order.dni ?? null,
                    notes: order.notes ?? null,
                    createdAt: order.createdAt,
                    items: [],
                    totalAmount: 0,
                });
            }
            const group = groupMap.get(key);
            if (order.orderNumber && !group.orderNumber)
                group.orderNumber = order.orderNumber;
            group.items.push({
                orderId: order.id,
                name: order.item.name,
                emoji: order.item.emoji,
                unitPrice: order.item.price,
                quantity: order.quantity,
                total: order.total,
            });
            group.totalAmount = parseFloat((group.totalAmount + order.total).toFixed(2));
            // worst-case status: lower index = more unresolved
            const curPri = STATUS_PRIORITY.indexOf(group.status);
            const newPri = STATUS_PRIORITY.indexOf(order.status);
            if (newPri !== -1 && (curPri === -1 || newPri < curPri))
                group.status = order.status;
        }
        // Sort groups newest first
        const merchGroups = Array.from(groupMap.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json({ data: { merch: merchGroups, lives: lifeOrders, vip: vipEntries } });
    }
    catch (err) {
        next(err);
    }
}
// ─── Admin: life orders list ──────────────────────────────────────────────────
async function listLifeOrders(req, res, next) {
    try {
        const userId = req.query['userId'];
        const orders = await prisma.lifeOrder.findMany({
            where: userId ? { userId } : undefined,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, name: true, username: true, email: true } } },
        });
        const totalRevenue = orders.reduce((s, o) => s + o.price, 0);
        res.json({ data: orders, totalRevenue });
    }
    catch (err) {
        next(err);
    }
}
// ─── Admin: VIP game entries ──────────────────────────────────────────────────
async function listVipEntries(req, res, next) {
    try {
        const entries = await prisma.gameEntry.findMany({
            where: { game: { entryFee: { gt: 0 } } },
            orderBy: { joinedAt: 'desc' },
            select: {
                id: true,
                orderNumber: true,
                userId: true,
                gameId: true,
                joinedAt: true,
                user: { select: { id: true, name: true, username: true, email: true } },
                game: { select: { id: true, title: true, entryFee: true, scheduledAt: true } },
            },
        });
        res.json({ data: entries });
    }
    catch (err) {
        next(err);
    }
}
// ─── Admin: export CSV ────────────────────────────────────────────────────────
function escapeCsv(val) {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n'))
        return `"${s.replace(/"/g, '""')}"`;
    return s;
}
async function exportSales(req, res, next) {
    try {
        const type = req.query['type'] || 'all';
        const fromRaw = req.query['from'];
        const toRaw = req.query['to'];
        const from = fromRaw ? new Date(`${fromRaw}T00:00:00.000Z`) : undefined;
        const to = toRaw ? new Date(`${toRaw}T23:59:59.999Z`) : undefined;
        const dateFilter = (from || to) ? { gte: from, lte: to } : undefined;
        // Unified header — all types share the same columns
        const header = 'TIPO,FECHA,USUARIO,EMAIL,DESCRIPCION,MONTO,METODO,ESTADO,EXTRA';
        const rows = [header];
        if (type === 'all' || type === 'merch') {
            const orders = await prisma.order.findMany({
                where: dateFilter ? { createdAt: dateFilter } : {},
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { username: true, email: true } },
                    item: { select: { name: true, emoji: true } },
                },
            });
            for (const o of orders) {
                rows.push([
                    'MERCH',
                    new Date(o.createdAt).toISOString(),
                    escapeCsv(o.user.username),
                    escapeCsv(o.user.email),
                    escapeCsv(`${o.item.emoji} ${o.item.name} x${o.quantity}`),
                    o.total.toFixed(2),
                    o.method.toUpperCase(),
                    o.status,
                    escapeCsv(o.address ?? ''),
                ].join(','));
            }
        }
        if (type === 'all' || type === 'lives') {
            const lifeOrders = await prisma.lifeOrder.findMany({
                where: dateFilter ? { createdAt: dateFilter } : {},
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { username: true, email: true } } },
            });
            for (const o of lifeOrders) {
                rows.push([
                    'VIDAS',
                    new Date(o.createdAt).toISOString(),
                    escapeCsv(o.user.username),
                    escapeCsv(o.user.email),
                    escapeCsv(`${o.packLabel} (${o.lives * o.quantity} vidas)`),
                    o.price.toFixed(2),
                    o.method.toUpperCase(),
                    'ACREDITADO',
                    '',
                ].join(','));
            }
        }
        if (type === 'all' || type === 'vip') {
            const vipEntries = await prisma.gameEntry.findMany({
                where: {
                    game: { entryFee: { gt: 0 } },
                    ...(dateFilter ? { joinedAt: dateFilter } : {}),
                },
                orderBy: { joinedAt: 'desc' },
                include: {
                    user: { select: { username: true, email: true } },
                    game: { select: { title: true, entryFee: true } },
                },
            });
            for (const e of vipEntries) {
                rows.push([
                    'ENTRADA VIP',
                    new Date(e.joinedAt).toISOString(),
                    escapeCsv(e.user.username),
                    escapeCsv(e.user.email),
                    escapeCsv(`Entrada: ${e.game.title}`),
                    e.game.entryFee.toFixed(2),
                    'EXTERNO',
                    'CONFIRMADO',
                    '',
                ].join(','));
            }
        }
        const dateLabel = fromRaw && toRaw ? `_${fromRaw}_${toRaw}` : '';
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="qtrivia_ventas_${type}${dateLabel}.csv"`);
        res.send('﻿' + rows.join('\n'));
    }
    catch (err) {
        next(err);
    }
}
//# sourceMappingURL=shop.controller.js.map