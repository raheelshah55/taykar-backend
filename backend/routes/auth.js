const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// 1. SEND OTP
router.post('/send-otp', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) return res.status(400).json({ message: "Phone number required" });
        res.status(200).json({ message: "OTP Sent!", otp: "1234" });
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});

// 2. VERIFY OTP & LOGIN
router.post('/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, otp, selectedRole } = req.body;
        if (otp !== "1234") return res.status(400).json({ message: "Invalid OTP Code" });

        let user = await User.findOne({ phoneNumber });
        
        if (user) {
            // Update their role to whatever they clicked on the Welcome Screen!
            user.activeRole = selectedRole || 'rider';
            await user.save();
            
            const token = jwt.sign({ userId: user._id, activeRole: user.activeRole }, process.env.JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({ isRegistered: true, token, user });
        } else {
            return res.status(200).json({ isRegistered: false });
        }
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});

// --- 3. REGISTER NEW PHONE USER ---
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, city, address, phoneNumber, selectedRole, cnicFront, cnicBack, vehicleDocs, email } = req.body;
        
        const fakeEmail = email || `${phoneNumber}@taykar.com`;
        const fakePassword = await bcrypt.hash("phoneUser123", 10);

        const newUser = new User({ 
            firstName, 
            lastName,
            city,
            address,
            phoneNumber, 
            activeRole: selectedRole || 'rider',
            email: fakeEmail,
            password: fakePassword,
            driverProfile: {
                isApproved: false,
                isOnline: false,
                cnicFront: cnicFront || '',
                cnicBack: cnicBack || '',
                vehicleDocs: vehicleDocs || ''
            }
        });
        
        await newUser.save();

        const token = jwt.sign({ userId: newUser._id, activeRole: newUser.activeRole }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: newUser });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ message: "Server error" }); 
    }
});