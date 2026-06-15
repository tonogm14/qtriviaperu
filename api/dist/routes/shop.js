"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const permissions_1 = require("../config/permissions");
const shopController = __importStar(require("../controllers/shop.controller"));
const router = (0, express_1.Router)();
// Public (authenticated user)
router.get('/products', auth_1.authenticate, shopController.listProducts);
router.get('/my-orders', auth_1.authenticate, auth_1.requireUser, shopController.myOrders);
router.post('/buy-lives', auth_1.authenticate, auth_1.requireUser, shopController.buyLives);
router.post('/order-merch', auth_1.authenticate, auth_1.requireUser, shopController.orderMerch);
router.post('/cart-checkout', auth_1.authenticate, auth_1.requireUser, shopController.cartCheckout);
// Admin CRUD — life packs
router.get('/admin/packs', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.SHOP_READ), shopController.listPacksAdmin);
router.post('/admin/packs', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.SHOP_WRITE), shopController.createPack);
router.put('/admin/packs/:id', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.SHOP_WRITE), shopController.updatePack);
router.delete('/admin/packs/:id', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.SHOP_WRITE), shopController.deletePack);
// Admin CRUD — merch
router.get('/admin/merch', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.SHOP_READ), shopController.listMerchAdmin);
router.post('/admin/merch', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.SHOP_WRITE), shopController.createMerch);
router.put('/admin/merch/:id', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.SHOP_WRITE), shopController.updateMerch);
router.delete('/admin/merch/:id', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.SHOP_WRITE), shopController.deleteMerch);
// Admin — orders
router.get('/admin/orders', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.SHOP_READ), shopController.listOrders);
router.get('/admin/life-orders', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.SHOP_READ), shopController.listLifeOrders);
router.get('/admin/vip-entries', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.SHOP_READ), shopController.listVipEntries);
router.get('/admin/export', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.SHOP_READ), shopController.exportSales);
router.put('/admin/orders/:id/status', auth_1.authenticate, (0, auth_1.requirePermission)(permissions_1.PERMISSIONS.SHOP_WRITE), shopController.updateOrderStatus);
exports.default = router;
//# sourceMappingURL=shop.js.map