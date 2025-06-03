const express = require('express');
const stripe = require('stripe')('your_secret_key'); // Replace with your Stripe secret key
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Email transporter configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your_email@gmail.com', // Replace with your email
        pass: 'your_app_password' // Replace with your app-specific password
    }
});

// Create payment intent
app.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount, name, email, phone, address } = req.body;

        // Create a customer in Stripe
        const customer = await stripe.customers.create({
            name,
            email,
            phone,
            metadata: {
                address
            }
        });

        // Create a payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'kes', // Changed to KES
            customer: customer.id,
            metadata: {
                name,
                email,
                phone,
                address
            }
        });

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
});

// Send confirmation email
app.post('/send-confirmation', async (req, res) => {
    try {
        const { paymentId, customerEmail } = req.body;

        // Get payment details from Stripe
        const payment = await stripe.paymentIntents.retrieve(paymentId);

        // Send confirmation email
        await transporter.sendMail({
            from: 'your_email@gmail.com',
            to: customerEmail,
            subject: 'Booking Confirmation - Servanna',
            html: `
                <h2>Thank you for your booking!</h2>
                <p>Dear ${payment.metadata.name},</p>
                <p>Your payment of KES ${(payment.amount).toLocaleString()} has been processed successfully.</p>
                <p>Booking Details:</p>
                <ul>
                    <li>Service Address: ${payment.metadata.address}</li>
                    <li>Phone: ${payment.metadata.phone}</li>
                    <li>Transaction ID: ${payment.id}</li>
                </ul>
                <p>We will contact you shortly to confirm your appointment time.</p>
                <p>If you have any questions, please don't hesitate to contact us.</p>
                <br>
                <p>Best regards,</p>
                <p>Servanna Team</p>
            `
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to send confirmation email' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 