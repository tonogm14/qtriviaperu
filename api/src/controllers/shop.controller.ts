import { Request, Response, NextFunction } from 'express';
import { PrismaClient, OrderStatus } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';
import { logActivity } from '../services/activity.service';
import { sendPushToUser } from '../services/pushNotifications';
import * as culqi from '../services/culqi.service';

const prisma = new PrismaClient();

// ─── Public: list products ────────────────────────────────────────────────────

export async function listProducts(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [packs, merch] = await prisma.$transaction([
      prisma.lifePack.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.merchItem.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    ]);
    res.json({ data: { packs, merch } });
  } catch (err) { next(err) }
}

// ─── Buy lives ────────────────────────────────────────────────────────────────

const buyLivesSchema = z.object({
  pack:     z.string(),
  method:   z.enum(['yape', 'plin', 'card']).default('yape'),
  quantity: z.number().int().min(1).max(10).default(1),
});

export async function buyLives(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { pack: packId, method, quantity } = buyLivesSchema.parse(req.body);
    const userId = req.user!.id;

    const pack = await prisma.lifePack.findUnique({ where: { id: packId } });
    if (!pack || !pack.active) throw new AppError('Pack no disponible', 404, 'NOT_FOUND');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

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

    logActivity({ userId, type: 'buy_lives', action: `Compró ${totalLives} vidas vía ${method}`, meta: { packId, quantity, price: totalPrice } });
    res.json({ data: { lives: updated.lives, pack: packId, method, quantity, price: totalPrice } });
  } catch (err) { next(err) }
}

// ─── Order merch ──────────────────────────────────────────────────────────────

const orderMerchSchema = z.object({
  itemId:   z.string(),
  method:   z.enum(['yape', 'plin', 'card']).default('yape'),
  quantity: z.number().int().min(1).max(10).default(1),
  address:  z.string().optional(),
  phone:    z.string().optional(),
});

export async function orderMerch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { itemId, method, quantity, address, phone } = orderMerchSchema.parse(req.body);
    const userId = req.user!.id;

    const item = await prisma.merchItem.findUnique({ where: { id: itemId } });
    if (!item || !item.active) throw new AppError('Item no disponible', 404, 'NOT_FOUND');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    if (item.stock !== -1) {
      if (item.stock < quantity) throw new AppError('Stock insuficiente', 400, 'OUT_OF_STOCK');
    }

    const total = item.price * quantity;

    let orderNumber: number | undefined;
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
          status: OrderStatus.PENDING,
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

    logActivity({ userId, type: 'order_merch', action: `Ordenó ${quantity}× ${item.name} vía ${method}`, meta: { itemId, quantity, total } });
    res.json({ data: { itemId, quantity, method, total, orderNumber } });
  } catch (err) { next(err) }
}

// ─── Admin: CRUD life packs ───────────────────────────────────────────────────

const lifePackSchema = z.object({
  lives:     z.number().int().min(1),
  price:     z.number().positive(),
  label:     z.string().min(1),
  tag:       z.string().optional().nullable(),
  active:    z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function listPacksAdmin(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const packs = await prisma.lifePack.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({ data: packs });
  } catch (err) { next(err) }
}

export async function createPack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = lifePackSchema.parse(req.body);
    const id = req.body.id ?? `pack_${Date.now()}`;
    const pack = await prisma.lifePack.create({ data: { id, ...body } });
    res.status(201).json({ data: pack });
  } catch (err) { next(err) }
}

export async function updatePack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = lifePackSchema.partial().parse(req.body);
    const pack = await prisma.lifePack.update({ where: { id: req.params['id'] as string }, data: body });
    res.json({ data: pack });
  } catch (err) { next(err) }
}

export async function deletePack(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.lifePack.delete({ where: { id: req.params['id'] as string } });
    res.json({ data: { message: 'Deleted' } });
  } catch (err) { next(err) }
}

// ─── Admin: CRUD merch items ──────────────────────────────────────────────────

const merchItemSchema = z.object({
  emoji:     z.string().min(1),
  name:      z.string().min(1),
  desc:      z.string().min(1),
  price:     z.number().positive(),
  stock:     z.number().int().min(-1).optional(),
  active:    z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  gradient:  z.string().optional(),
});

export async function listMerchAdmin(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await prisma.merchItem.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({ data: items });
  } catch (err) { next(err) }
}

export async function createMerch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = merchItemSchema.parse(req.body);
    const id = req.body.id ?? `item_${Date.now()}`;
    const item = await prisma.merchItem.create({ data: { id, ...body } });
    res.status(201).json({ data: item });
  } catch (err) { next(err) }
}

export async function updateMerch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = merchItemSchema.partial().parse(req.body);
    const item = await prisma.merchItem.update({ where: { id: req.params['id'] as string }, data: body });
    res.json({ data: item });
  } catch (err) { next(err) }
}

export async function deleteMerch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.merchItem.delete({ where: { id: req.params['id'] as string } });
    res.json({ data: { message: 'Deleted' } });
  } catch (err) { next(err) }
}

// ─── Admin: orders ────────────────────────────────────────────────────────────

export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = req.query['status'] as string | undefined;
    const userId = req.query['userId'] as string | undefined;
    const where: any = {};
    if (status) where.status = status as OrderStatus;
    if (userId) where.userId = userId;
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
    const groupMap = new Map<string, any>();
    for (const order of orders) {
      const key = (order as any).cartRef ?? order.id;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          id: key,
          orderNumber: (order as any).orderNumber ?? null,
          cartRef: (order as any).cartRef ?? null,
          method: order.method,
          status: order.status,
          address: order.address,
          phone: (order as any).phone ?? null,
          recipientName: (order as any).recipientName ?? null,
          dni: (order as any).dni ?? null,
          notes: (order as any).notes ?? null,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          user: order.user,
          items: [],
          totalAmount: 0,
        });
      }
      const group = groupMap.get(key);
      if ((order as any).orderNumber && !group.orderNumber) group.orderNumber = (order as any).orderNumber;
      group.items.push({
        orderId: order.id,
        name: order.item.name,
        emoji: order.item.emoji,
        unitPrice: order.item.price,
        quantity: order.quantity,
        total: order.total,
      });
      group.totalAmount = parseFloat((group.totalAmount + order.total).toFixed(2));
      const curPri = STATUS_PRIORITY.indexOf(group.status as string);
      const newPri = STATUS_PRIORITY.indexOf(order.status as string);
      if (newPri !== -1 && (curPri === -1 || newPri < curPri)) group.status = order.status;
    }

    const grouped = Array.from(groupMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json({ data: grouped, summary });
  } catch (err) { next(err) }
}

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, notes } = z.object({
      status: z.nativeEnum(OrderStatus),
      notes: z.string().optional(),
    }).parse(req.body);

    // The :id may be a cartRef or an individual order id — resolve to individual order first
    const paramId = req.params['id'] as string;
    const targetOrder = await prisma.order.findFirst({
      where: { OR: [{ id: paramId }, { cartRef: paramId }] },
    });
    if (!targetOrder) throw new AppError('Order not found', 404, 'NOT_FOUND');

    // If cartRef exists, update all orders in the group; otherwise just the one
    const cartRef = (targetOrder as any).cartRef as string | null;
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
    const statusNotifications: Partial<Record<OrderStatus, { title: string; body: string }>> = {
      [OrderStatus.CONFIRMED]: {
        title: '¡Pedido confirmado! ✅',
        body: `Tu pedido de ${order.item.name} ha sido confirmado y está siendo preparado.`,
      },
      [OrderStatus.SHIPPED]: {
        title: '¡Tu pedido está en camino! 📦',
        body: `Tu pedido de ${order.item.name} fue enviado. Llegará pronto.`,
      },
      [OrderStatus.DELIVERED]: {
        title: '¡Pedido entregado! 🎉',
        body: `Tu pedido de ${order.item.name} fue entregado. ¡Disfrútalo!`,
      },
      [OrderStatus.CANCELLED]: {
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
        sendPushToUser(order.userId, notif.title, notif.body, { orderId: order.id, status }),
      ]);
    }
    res.json({ data: order });
  } catch (err) { next(err) }
}

// ─── Cart checkout (mobile) ───────────────────────────────────────────────────

const cartCheckoutSchema = z.object({
  items: z.array(z.object({
    itemId:   z.string(),
    quantity: z.number().int().min(1).max(10),
  })).min(1),
  method:        z.enum(['yape', 'plin', 'card']).default('yape'),
  recipientName: z.string().min(2),
  dni:           z.string().min(6),
  phone:         z.string().min(7),
  address:       z.string().min(5),
  notes:         z.string().optional(),
});

export async function cartCheckout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { items, method, recipientName, dni, phone, address, notes } = cartCheckoutSchema.parse(req.body);
    const userId = req.user!.id;

    // One sequence number for the whole cart
    const seq = await prisma.orderSeq.create({ data: {} });
    const orderNumber = seq.id;
    const cartRef = `CART-${orderNumber}`;
    const createdOrders: any[] = [];

    await prisma.$transaction(async (tx) => {
      for (const { itemId, quantity } of items) {
        const item = await tx.merchItem.findUnique({ where: { id: itemId } });
        if (!item || !item.active) throw new AppError(`Item ${itemId} no disponible`, 404, 'NOT_FOUND');
        if (item.stock !== -1 && item.stock < quantity) throw new AppError(`Stock insuficiente para ${item.name}`, 400, 'OUT_OF_STOCK');

        if (item.stock !== -1) {
          await tx.merchItem.update({ where: { id: itemId }, data: { stock: { decrement: quantity } } });
        }

        const total = item.price * quantity;
        const order = await tx.order.create({
          data: { userId, itemId, quantity, total, method, status: OrderStatus.PENDING, orderNumber: createdOrders.length === 0 ? orderNumber : null, address, phone, recipientName, dni, notes, cartRef },
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

    logActivity({ userId, type: 'order_merch', action: `Carrito: ${createdOrders.length} items`, meta: { cartRef, orderNumber, items } });
    res.json({ data: { cartRef, orderNumber, orders: createdOrders.length } });
  } catch (err) { next(err) }
}

// ─── My orders (mobile — merch + lives) ──────────────────────────────────────

export async function myOrders(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
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
    const groupMap = new Map<string, any>();
    for (const order of orders) {
      const key = (order as any).cartRef ?? order.id;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          id: key,
          orderNumber: (order as any).orderNumber ?? null,
          cartRef: (order as any).cartRef ?? null,
          method: order.method,
          status: order.status,
          address: order.address,
          phone: (order as any).phone ?? null,
          recipientName: (order as any).recipientName ?? null,
          dni: (order as any).dni ?? null,
          notes: (order as any).notes ?? null,
          createdAt: order.createdAt,
          items: [],
          totalAmount: 0,
        });
      }
      const group = groupMap.get(key);
      if ((order as any).orderNumber && !group.orderNumber) group.orderNumber = (order as any).orderNumber;
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
      const curPri = STATUS_PRIORITY.indexOf(group.status as string);
      const newPri = STATUS_PRIORITY.indexOf(order.status as string);
      if (newPri !== -1 && (curPri === -1 || newPri < curPri)) group.status = order.status;
    }

    // Sort groups newest first
    const merchGroups = Array.from(groupMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json({ data: { merch: merchGroups, lives: lifeOrders, vip: vipEntries } });
  } catch (err) { next(err) }
}

// ─── Admin: life orders list ──────────────────────────────────────────────────

export async function listLifeOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.query['userId'] as string | undefined;
    const orders = await prisma.lifeOrder.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, username: true, email: true } } },
    });
    const totalRevenue = orders.reduce((s, o) => s + o.price, 0);
    res.json({ data: orders, totalRevenue });
  } catch (err) { next(err) }
}

// ─── Admin: VIP game entries ──────────────────────────────────────────────────

export async function listVipEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
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
  } catch (err) { next(err) }
}

// ─── Admin: export CSV ────────────────────────────────────────────────────────

function escapeCsv(val: unknown): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function exportSales(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const type = (req.query['type'] as string) || 'all';
    const fromRaw = req.query['from'] as string | undefined;
    const toRaw   = req.query['to']   as string | undefined;

    const from = fromRaw ? new Date(`${fromRaw}T00:00:00.000Z`) : undefined;
    const to   = toRaw   ? new Date(`${toRaw}T23:59:59.999Z`)   : undefined;
    const dateFilter = (from || to) ? { gte: from, lte: to } : undefined;

    // Unified header — all types share the same columns
    const header = 'TIPO,FECHA,USUARIO,EMAIL,DESCRIPCION,MONTO,METODO,ESTADO,EXTRA';
    const rows: string[] = [header];

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
  } catch (err) { next(err) }
}

// ─── Yape/Plin order via Culqi ────────────────────────────────────────────────

const yapeOrderSchema = z.object({
  items: z.array(z.object({
    itemId:   z.string(),
    quantity: z.number().int().min(1).max(10),
  })).min(1),
  recipientName: z.string().min(2),
  dni:           z.string().min(6),
  phone:         z.string().min(7),
  address:       z.string().min(5),
  notes:         z.string().optional(),
});

export async function createYapeOrder(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { items, recipientName, dni, phone, address, notes } = yapeOrderSchema.parse(req.body);
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Usuario no encontrado', 404, 'NOT_FOUND');

    const seq = await prisma.orderSeq.create({ data: {} });
    const orderNumber = seq.id;
    const cartRef = `CART-${orderNumber}`;
    const createdOrders: any[] = [];

    await prisma.$transaction(async (tx) => {
      for (const { itemId, quantity } of items) {
        const item = await tx.merchItem.findUnique({ where: { id: itemId } });
        if (!item || !item.active) throw new AppError(`Item ${itemId} no disponible`, 404, 'NOT_FOUND');
        if (item.stock !== -1 && item.stock < quantity) throw new AppError(`Stock insuficiente para ${item.name}`, 400, 'OUT_OF_STOCK');
        if (item.stock !== -1) {
          await tx.merchItem.update({ where: { id: itemId }, data: { stock: { decrement: quantity } } });
        }
        const total = item.price * quantity;
        const order = await tx.order.create({
          data: {
            userId, itemId, quantity, total, method: 'yape', status: OrderStatus.PENDING,
            orderNumber: createdOrders.length === 0 ? orderNumber : null,
            address, phone, recipientName, dni, notes, cartRef,
          },
          include: { item: { select: { id: true, name: true, emoji: true, price: true } } },
        });
        createdOrders.push(order);
      }
    });

    const grandTotal = createdOrders.reduce((s: number, o: any) => s + o.total, 0);
    let checkoutUrl: string | null = null;
    let culqiOrderId: string | null = null;

    if (culqi.culqiEnabled()) {
      try {
        const nameParts = recipientName.trim().split(' ');
        const culqiOrder = await culqi.createCulqiOrder({
          amountSoles: grandTotal,
          orderNumber: cartRef,
          description: `Pedido QTrivia ${cartRef}`,
          email: user.email,
          firstName: nameParts[0] ?? recipientName,
          lastName: nameParts.slice(1).join(' ') || '-',
          phone,
        });
        culqiOrderId = culqiOrder.id;
        checkoutUrl = culqiOrder.checkout_url;
        await prisma.order.updateMany({
          where: { cartRef },
          data: { culqiOrderId },
        });
      } catch (culqiErr: any) {
        console.error('[Culqi] createOrder failed:', culqiErr?.message);
        // Fall through — order exists in DB, just no Culqi checkout link
      }
    }

    logActivity({ userId, type: 'order_merch', action: `Yape pedido: ${createdOrders.length} items`, meta: { cartRef, orderNumber } });
    res.json({ data: { cartRef, orderNumber, orders: createdOrders.length, checkoutUrl, culqiOrderId, culqiEnabled: culqi.culqiEnabled() } });
  } catch (err) { next(err) }
}

// ─── Culqi webhook ────────────────────────────────────────────────────────────

export async function culqiWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawBody: string = (req as any).rawBody ?? JSON.stringify(req.body);
    const signature = req.headers['x-culqi-signature'] as string | undefined;

    if (culqi.culqiEnabled() && signature) {
      if (!culqi.verifyWebhookSignature(rawBody, signature)) {
        res.status(401).json({ error: 'Firma inválida' });
        return;
      }
    }

    const event = req.body as any;
    const eventType: string = event?.type ?? '';
    const data = event?.data ?? {};

    const culqiOrderId: string | undefined = data?.order_id ?? data?.id;
    if (!culqiOrderId) { res.json({ received: true }); return; }

    const isPaymentSuccess =
      eventType.includes('payment.succeeded') ||
      eventType.includes('charge.creation.succeeded');
    if (!isPaymentSuccess) { res.json({ received: true }); return; }

    const orders = await prisma.order.findMany({ where: { culqiOrderId } });
    if (orders.length === 0) { res.json({ received: true }); return; }

    await prisma.order.updateMany({
      where: { culqiOrderId },
      data: { status: OrderStatus.CONFIRMED },
    });

    const userId = orders[0].userId;
    const cartRef = orders[0].cartRef ?? culqiOrderId;
    const grandTotal = orders.reduce((s, o) => s + o.total, 0);

    await prisma.notification.create({
      data: {
        userId,
        type: 'merch',
        title: '¡Pago confirmado! ✅',
        body: `Pedido ${cartRef} por S/${grandTotal.toFixed(2)} confirmado. Coordinamos el envío.`,
      },
    });
    await sendPushToUser(userId, '¡Pago confirmado! ✅', `Tu pedido ${cartRef} está confirmado.`, { type: 'merch' });

    console.log(`[Culqi] Webhook: confirmed ${orders.length} orders for ${culqiOrderId}`);
    res.json({ received: true });
  } catch (err) { next(err) }
}
