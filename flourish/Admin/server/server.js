const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Make sure to replace this with the actual path to your service account key file.
// This key grants your server elevated permissions.
const serviceAccount = require('./serviceAccountKey.json');

// Initialize the Firebase Admin SDK
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Your Firebase Configuration (No changes here)
const firebaseConfig = {
  apiKey: "AIzaSyDTZKJpdPKCunl7dFpjEUPXY-eboXkPrhk",
  authDomain: "flourish-adf09.firebaseapp.com",
  projectId: "flourish-adf09",
  storageBucket: "flourish-adf09.appspot.com",
  messagingSenderId: "853529980918",
  appId: "1:853529980918:web:abacb3f82df5a3681121d7"
};

const app = express();
const port = 3000;

// Middleware for parsing JSON and enabling CORS
app.use(express.json());
app.use(cors({ origin: '*' }));

// Direct email configuration (No changes here)
const EMAIL_USER = "flowershopflourish15@gmail.com";
const EMAIL_PASS = "ebvtfyqpedmqwwvx";

// Enhanced Nodemailer Transport with better error handling
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

const transporter = createTransporter();

// Helper function to validate required fields
const validateFields = (data, requiredFields) => {
  return requiredFields.every((field) => data[field] && typeof data[field] !== "undefined");
};

// Define email content generation functions
function generateOrderEmailHTML(formData) {
  const emailSubject = `Order ${formData.orderId} - Status Update: ${formData.status}`;
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #4a4a4a;">${emailSubject}</h2>
      <p>Dear ${formData.customerName},</p>
      <p>Your order <strong>#${formData.orderId}</strong> status has been updated to <strong>${formData.status}</strong>.</p>
      ${formData.productName ? `<p><strong>Product:</strong> ${formData.productName}</p>` : ''}
      <p>Thank you for shopping with us!</p>
      <p style="margin-top: 30px; color: #888; font-size: 14px;">
        This is an automated message. Please do not reply directly to this email.
      </p>
    </div>
  `;
}

// Function to send the email and log to Firestore
const sendOrderEmailAndLog = async (data, res) => {
  try {
    const requiredFields = ["customerEmail", "customerName", "orderId", "status", "productName"];
    if (!validateFields(data, requiredFields)) {
      return res.status(400).json({ error: "Missing required fields for order email" });
    }

    const emailHtml = generateOrderEmailHTML(data);
    const emailSubject = `Order ${data.orderId} - Status Update: ${data.status}`;

    const mailOptions = {
      from: EMAIL_USER,
      to: data.customerEmail,
      subject: emailSubject,
      html: emailHtml,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Order email sent:", info.response);

    // This is the line that will no longer throw a permission error
    const orderDocRef = db.collection('artifacts/flourish-flowers-app/public/data/orders').doc(data.orderId);
    await orderDocRef.update({ status: data.status });
    console.log(`Order ${data.orderId} updated to ${data.status} in Firestore.`);

    // Wait for the Firestore update to finish before sending success
    res.status(200).json({ message: "Order email sent and database updated successfully", info: info.response });

  } catch (error) {
    console.error("Error sending order email or updating Firestore:", error);

    res.status(500).json({ error: "Failed to send order email or update Firestore", details: error.message });
  }
};

// POST endpoint to handle email sending
app.post("/send-order-email", async (req, res) => {
  console.log("Received POST request to /send-order-email");
  await sendOrderEmailAndLog(req.body, res);
});

// Default route for health checks
app.get("/", (req, res) => {
  res.status(200).send("Email server is running.");
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log("Available Endpoint:");
  console.log(`- POST http://localhost:${port}/send-order-email`);
});