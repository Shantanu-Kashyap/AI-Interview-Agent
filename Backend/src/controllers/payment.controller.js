import razorpay from "../../services/razorpay.service.js";
import Payment from "../models/payment.mode..js";
import User from "../models/user.model.js";
import crypto from "crypto";


export const createOrder = async (req, res) => {
    try {
        const { planId, amount, credits } = req.body;

        if (!amount || !credits) {
            return res.status(400).json({ message: "Invalid plan data" });
        }

        const options = {
            amount: amount * 100, // convert to paise
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);

        await Payment.create({
            userId: req.userId,
            planId,
            amount,
            credits,
            razorpayOrderId: order.id,
            status: "created",
        });

        return res.status(201).json(order);

    } catch (error) {
        console.error("Error creating payment order:", error);
        return res.status(500).json({ message: "Error creating payment order" });
    }
};


export const verifyPayment = async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

        const body = razorpayOrderId + "|" + razorpayPaymentId;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpaySignature) {
            return res.status(400).json({ message: "Invalid payment signature" });
        }

        const payment = await Payment.findOne({ razorpayOrderId });
        if (!payment) {
            return res.status(404).json({ message: "Payment record not found" });
        }
        if (payment.status === "paid") {
            return res.status(400).json({ message: "Payment already verified" });
        }

        payment.razorpayPaymentId = razorpayPaymentId;
        payment.status = "paid";
        await payment.save();

        const updatedUser = await User.findByIdAndUpdate(
            payment.userId,
            { $inc: { credits: payment.credits } },
            { new: true }
        );

        return res.json({
            success: true,
            message: "Payment verified and credits added",
            user: updatedUser,
        });

    } catch (error) {
        console.error("Error verifying payment:", error);
        return res.status(500).json({ message: "Error verifying payment" });
    }
}