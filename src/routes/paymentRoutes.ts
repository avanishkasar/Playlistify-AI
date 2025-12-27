/**
 * Payment Routes - UPI Payment Integration for Pro Features
 * Handles payment order creation, verification, and Pro code generation
 */

import express, { Request, Response } from "express";
import crypto from "crypto";
import {
    createPaymentOrder,
    verifyPaymentOrder,
    getProCode,
    activateProCode,
    getPaymentOrderByCode
} from "../database.js";

const router = express.Router();

// UPI Configuration
const UPI_ID = "avanishkasar57@oksbi";
const UPI_NAME = "Playlistify AI";

// Product types and pricing
const PRODUCTS = {
    download: { name: "Playlist Download", price: 42, duration: 24 * 60 * 60 * 1000 }, // 24 hours
    apify: { name: "Apify Automation", price: 84, duration: null } // Permanent
};

/**
 * Generate UPI deep link
 */
function generateUPILink(amount: number, orderId: string, productName: string): string {
    const params = new URLSearchParams({
        pa: UPI_ID,
        pn: UPI_NAME,
        am: amount.toString(),
        cu: "INR",
        tn: `${productName} - Order ${orderId}`,
        tr: orderId // Transaction reference
    });
    return `upi://pay?${params.toString()}`;
}

/**
 * Generate a unique Pro code
 */
function generateProCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No confusing characters
    let code = "";
    for (let i = 0; i < 12; i++) {
        if (i > 0 && i % 4 === 0) code += "-";
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Create a new payment order
 * POST /api/payment/create-order
 */
router.post("/create-order", async (req: Request, res: Response): Promise<void> => {
    try {
        const { productType, userId } = req.body;

        if (!productType || !PRODUCTS[productType as keyof typeof PRODUCTS]) {
            res.status(400).json({
                status: "error",
                error: "Invalid product type"
            });
            return;
        }

        const product = PRODUCTS[productType as keyof typeof PRODUCTS];
        const orderId = `ORD${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const proCode = generateProCode();

        // Create order in database
        const order = createPaymentOrder({
            orderId,
            userId: userId || "guest",
            productType,
            amount: product.price,
            proCode,
            status: "pending"
        });

        // Generate UPI link
        const upiLink = generateUPILink(product.price, orderId, product.name);

        res.json({
            status: "success",
            data: {
                orderId,
                amount: product.price,
                productName: product.name,
                upiLink,
                upiId: UPI_ID,
                expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
            }
        });
    } catch (error: any) {
        console.error("[Payment] Create order error:", error);
        res.status(500).json({ status: "error", error: error.message });
    }
});

/**
 * Verify payment with transaction ID
 * POST /api/payment/verify
 */
router.post("/verify", async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId, transactionId } = req.body;

        if (!orderId || !transactionId) {
            res.status(400).json({
                status: "error",
                error: "Order ID and Transaction ID required"
            });
            return;
        }

        // Verify and update order
        const result = verifyPaymentOrder(orderId, transactionId);

        if (result.success) {
            const product = PRODUCTS[result.productType as keyof typeof PRODUCTS];
            const expiresAt = product.duration ? Date.now() + product.duration : null;

            res.json({
                status: "success",
                data: {
                    proCode: result.proCode,
                    productType: result.productType,
                    productName: product.name,
                    expiresAt
                }
            });
        } else {
            res.status(400).json({
                status: "error",
                error: result.error || "Verification failed"
            });
        }
    } catch (error: any) {
        console.error("[Payment] Verify error:", error);
        res.status(500).json({ status: "error", error: error.message });
    }
});

/**
 * Check payment order status
 * GET /api/payment/status/:orderId
 */
router.get("/status/:orderId", async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId } = req.params;
        const order = getPaymentOrderByCode(orderId);

        if (!order) {
            res.status(404).json({
                status: "error",
                error: "Order not found"
            });
            return;
        }

        res.json({
            status: "success",
            data: {
                orderId: order.orderId,
                status: order.status,
                amount: order.amount,
                productType: order.productType,
                proCode: order.status === "verified" ? order.proCode : null,
                createdAt: order.createdAt
            }
        });
    } catch (error: any) {
        console.error("[Payment] Status check error:", error);
        res.status(500).json({ status: "error", error: error.message });
    }
});

/**
 * Activate Pro features with code
 * POST /api/payment/activate
 */
router.post("/activate", async (req: Request, res: Response): Promise<void> => {
    try {
        const { proCode, userId } = req.body;

        if (!proCode) {
            res.status(400).json({
                status: "error",
                error: "Pro code required"
            });
            return;
        }

        const result = activateProCode(proCode, userId || "guest");

        if (result.success) {
            res.json({
                status: "success",
                data: {
                    productType: result.productType,
                    expiresAt: result.expiresAt,
                    message: "Pro features activated!"
                }
            });
        } else {
            res.status(400).json({
                status: "error",
                error: result.error || "Invalid or expired code"
            });
        }
    } catch (error: any) {
        console.error("[Payment] Activate error:", error);
        res.status(500).json({ status: "error", error: error.message });
    }
});

/**
 * Check if user has active Pro subscription
 * GET /api/payment/check-pro/:userId
 */
router.get("/check-pro/:userId", async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const proStatus = getProCode(userId);

        if (proStatus && proStatus.isActive) {
            res.json({
                status: "success",
                data: {
                    hasPro: true,
                    productType: proStatus.productType,
                    expiresAt: proStatus.expiresAt
                }
            });
        } else {
            res.json({
                status: "success",
                data: { hasPro: false }
            });
        }
    } catch (error: any) {
        console.error("[Payment] Check pro error:", error);
        res.status(500).json({ status: "error", error: error.message });
    }
});

export default router;
