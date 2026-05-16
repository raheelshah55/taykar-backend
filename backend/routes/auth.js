const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Helper to format Pakistani numbers automatically for Twilio
const formatPhone = (phone) => {
    if (phone.startsWith('0')) return '+92' + phone.slice(1);
    if (!phone.startsWith('+')) return '+' + phone;
    return phone;
};

// Initialize Twilio
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// --- 1. SEND REAL SMS OTP ---
router.post('/send-otp', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) return res.status(400).json({ message: "Phone number required" });
        
        // ✨ REAL WORLD: Twilio physically sends an SMS to the user!
        await client.verify.v2.services(process.env.TWILIO_VERIFY_SID)
            .verifications
            .create({ to: formatPhone(phoneNumber), channel: 'sms' });

        res.status(200).json({ message: "Real OTP Sent!" });
    } catch (error) {
        console.error("Twilio Send Error:", error);
        res.status(500).json({ message: "Failed to send SMS. Check Twilio." });
    }
});

// --- 2. VERIFY REAL OTP ---
router.post('/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, otp, selectedRole } = req.body;
        
        // ✨ REAL WORLD: Ask Twilio if the code the user typed is correct!
        const verification = await client.verify.v2.services(process.env.TWILIO_VERIFY_SID)
            .verificationChecks
            .create({ to: formatPhone(phoneNumber), code: otp });

        if (verification.status !== 'approved') {
            return res.status(400).json({ message: "Incorrect OTP Code!" });
        }

        let user = await User.findOne({ phoneNumber });
        
        if (user) {
            user.activeRole = selectedRole || 'rider';
            await user.save();
            const token = jwt.sign({ userId: user._id, activeRole: user.activeRole }, process.env.JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({ isRegistered: true, token, user });
        } else {
            return res.status(200).json({ isRegistered: false });
        }
    } catch (error) {
        console.error("Twilio Verify Error:", error);
        res.status(500).json({ message: "OTP Verification failed." });
    }
});
// --- 3. REGISTER NEW PHONE USER (With Vehicle Info) ---
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, city, address, phoneNumber, selectedRole, cnicFront, cnicBack, vehicleDocs, email, vehicleInfo, licensePlate } = req.body;
        
        const fakeEmail = email || `${phoneNumber}@taykar.com`;
        const fakePassword = await bcrypt.hash("phoneUser123", 10);

        const newUser = new User({ 
            firstName, lastName, city, address, phoneNumber, activeRole: selectedRole || 'rider',
            email: fakeEmail, password: fakePassword,
            driverProfile: { 
                isApproved: false, isOnline: false, 
                cnicFront: cnicFront || '', cnicBack: cnicBack || '', vehicleDocs: vehicleDocs || '',
                vehicleInfo: vehicleInfo || '', licensePlate: licensePlate || ''
            }
        });
        
        await newUser.save();
        const token = jwt.sign({ userId: newUser._id, activeRole: newUser.activeRole }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: newUser });
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});

// --- 4. ADMIN LOGIN ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid email" });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid password" });
        const token = jwt.sign({ userId: user._id, activeRole: user.activeRole }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({ token, user });
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});

// --- 5. SWITCH ROLE ---
router.put('/switch-role', verifyToken, async (req, res) => {
    try {
        const { newRole } = req.body;
        const user = await User.findById(req.user.userId);
        user.activeRole = newRole;
        await user.save();
        const token = jwt.sign({ userId: user._id, activeRole: user.activeRole }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({ token, user });
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});

// --- 6. UPLOAD DOCS (For Upgrading Riders) ---
router.put('/upload-docs', verifyToken, async (req, res) => {
    try {
        const { cnicFront, cnicBack, vehicleDocs, email, vehicleInfo, licensePlate } = req.body;
        const user = await User.findById(req.user.userId);
        if (email) user.email = email;
        user.driverProfile.cnicFront = cnicFront; 
        user.driverProfile.cnicBack = cnicBack; 
        user.driverProfile.vehicleDocs = vehicleDocs;
        user.driverProfile.vehicleInfo = vehicleInfo;
        user.driverProfile.licensePlate = licensePlate;
        user.driverProfile.isApproved = false; 
        await user.save();
        res.status(200).json({ message: "Documents uploaded successfully!", user });
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});
// --- 7. SAVE EXPO PUSH TOKEN ---
router.put('/push-token', verifyToken, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.userId, { pushToken: req.body.token });
        res.status(200).json({ message: "Push token saved!" });
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});
// --- 8. GET IN-APP NOTIFICATIONS ---
router.get('/notifications', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        res.status(200).json(user.notifications.reverse()); // Newest first!
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});
module.exports = router;