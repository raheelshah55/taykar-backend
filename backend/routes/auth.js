const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// --- 1. SEND OTP (SIMULATED) ---
router.post('/send-otp', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) return res.status(400).json({ message: "Phone number required" });
        
        // In a real app, you would trigger Twilio/Firebase SMS here.
        // For testing, we will pretend we sent "1234".
        res.status(200).json({ message: "OTP Sent!", otp: "1234" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// --- 2. VERIFY OTP & LOGIN/CHECK ---
router.post('/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, otp, selectedRole } = req.body;
        
        if (otp !== "1234") return res.status(400).json({ message: "Invalid OTP Code" });

        let user = await User.findOne({ phoneNumber });
        
        if (user) {
            // User exists! Auto-switch them to the role they selected on the Welcome Screen
            user.activeRole = selectedRole;
            await user.save();
            
            const token = jwt.sign({ userId: user._id, activeRole: user.activeRole }, process.env.JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({ isRegistered: true, token, user });
        } else {
            // User doesn't exist yet! Tell the app to show the Sign Up screen.
            return res.status(200).json({ isRegistered: false });
        }
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// --- 3. REGISTER NEW PHONE USER ---
router.post('/register', async (req, res) => {
    try {
        const { name, phoneNumber, selectedRole } = req.body;
        
        const newUser = new User({ name, phoneNumber, activeRole: selectedRole });
        await newUser.save();

        const token = jwt.sign({ userId: newUser._id, activeRole: newUser.activeRole }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: newUser });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// --- 4. OLD LOGIN (Kept for Admin Panel only) ---
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

module.exports = router;