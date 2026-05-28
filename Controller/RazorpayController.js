const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET
});

async function createOrder(req, res, next) {
    try {
        const options = {
            amount: req.body.amount * 100,
            currency: "INR",
            receipt: "receipt_" + Date.now()
        };
        const order = await razorpay.orders.create(options);
        res.send({success: true,data: order});
    } catch (error) {
        res.status(500).send({success: false,message:error.message ||"Technical error"});
    }

}

async function verifyPayment(req, res, next) {

    try {

        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto.createHmac("sha256",process.env.RAZORPAY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature === razorpay_signature) {

            return res.send({
                success: true,message:"Payment verified successfully"
            });

        }
        return res.send({success: false,message: "Invalid signature"});
    } catch (error) {
        res.status(500).send({success: false,message:error.message || "Technical error"
        });
    }
}

exports.Razorpay = {
    createOrder,
    verifyPayment
};