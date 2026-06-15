import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../types';
import { getSharedDevices } from '../services/device.service';

const prisma = new PrismaClient();

export async function getFlaggedUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
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
  } catch (err) {
    next(err);
  }
}

export async function getSharedDevicesHandler(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getSharedDevices();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function unflagUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const user = await prisma.user.update({
      where: { id },
      data: { isFlagged: false, flagReason: null },
      select: { id: true, username: true, isFlagged: true },
    });
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function banUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false, isFlagged: true, flagReason: 'banned_by_admin' },
      select: { id: true, username: true, isActive: true },
    });
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function getUserDevices(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const devices = await prisma.userDevice.findMany({
      where: { userId: id },
      orderBy: { lastSeenAt: 'desc' },
    });
    res.json({ data: devices });
  } catch (err) {
    next(err);
  }
}
