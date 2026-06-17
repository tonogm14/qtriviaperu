import { Router, RequestHandler } from 'express';
import { authenticate, requireUser, requirePermission } from '../middleware/auth';
import { PERMISSIONS } from '../config/permissions';
import * as shopController from '../controllers/shop.controller';

const router = Router();

// Public (authenticated user)
router.get('/products',        authenticate, shopController.listProducts as RequestHandler);
router.get('/my-orders',       authenticate, requireUser, shopController.myOrders as RequestHandler);
router.post('/buy-lives',      authenticate, requireUser, shopController.buyLives as RequestHandler);
router.post('/order-merch',    authenticate, requireUser, shopController.orderMerch as RequestHandler);
router.post('/cart-checkout',  authenticate, requireUser, shopController.cartCheckout as RequestHandler);
router.post('/yape-order',     authenticate, requireUser, shopController.createYapeOrder as RequestHandler);
router.post('/culqi-webhook',  shopController.culqiWebhook as RequestHandler);

// Admin CRUD — life packs
router.get('/admin/packs',        authenticate, requirePermission(PERMISSIONS.SHOP_READ),  shopController.listPacksAdmin as RequestHandler);
router.post('/admin/packs',       authenticate, requirePermission(PERMISSIONS.SHOP_WRITE), shopController.createPack as RequestHandler);
router.put('/admin/packs/:id',    authenticate, requirePermission(PERMISSIONS.SHOP_WRITE), shopController.updatePack as RequestHandler);
router.delete('/admin/packs/:id', authenticate, requirePermission(PERMISSIONS.SHOP_WRITE), shopController.deletePack as RequestHandler);

// Admin CRUD — merch
router.get('/admin/merch',        authenticate, requirePermission(PERMISSIONS.SHOP_READ),  shopController.listMerchAdmin as RequestHandler);
router.post('/admin/merch',       authenticate, requirePermission(PERMISSIONS.SHOP_WRITE), shopController.createMerch as RequestHandler);
router.put('/admin/merch/:id',    authenticate, requirePermission(PERMISSIONS.SHOP_WRITE), shopController.updateMerch as RequestHandler);
router.delete('/admin/merch/:id', authenticate, requirePermission(PERMISSIONS.SHOP_WRITE), shopController.deleteMerch as RequestHandler);

// Admin — orders
router.get('/admin/orders',            authenticate, requirePermission(PERMISSIONS.SHOP_READ),  shopController.listOrders as RequestHandler);
router.get('/admin/life-orders',       authenticate, requirePermission(PERMISSIONS.SHOP_READ),  shopController.listLifeOrders as RequestHandler);
router.get('/admin/vip-entries',       authenticate, requirePermission(PERMISSIONS.SHOP_READ),  shopController.listVipEntries as RequestHandler);
router.get('/admin/export',            authenticate, requirePermission(PERMISSIONS.SHOP_READ),  shopController.exportSales as RequestHandler);
router.put('/admin/orders/:id/status', authenticate, requirePermission(PERMISSIONS.SHOP_WRITE), shopController.updateOrderStatus as RequestHandler);

export default router;
