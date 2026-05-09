const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/send-otp', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) return res.status(400).json({ message: "Phone number required" });
        res.status(200).json({ message: "OTP Sent!", otp: "1234" });
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});

router.post('/verify-otp', async (req, res) => {
    try {
        const { phoneNumber, otp, selectedRole } = req.body;
        if (otp !== "1234") return res.status(400).json({ message: "Invalid OTP Code" });

        let user = await User.findOne({ phoneNumber });
        if (user) {
            user.activeRole = selectedRole || 'rider';
            await user.save();
            const token = jwt.sign({ userId: user._id, activeRole: user.activeRole }, process.env.JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({ isRegistered: true, token, user });
        } else {
            return res.status(200).json({ isRegistered: false });
        }
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});

// ✨ NEW: Catches Vehicle Info & License Plate!
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
                vehicleInfo: vehicleInfo || '', licensePlate: licensePlate || '' // Saved to Database!
            }
        });
        
        await newUser.save();
        const token = jwt.sign({ userId: newUser._id, activeRole: newUser.activeRole }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: newUser });
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});

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

// ✨ NEW: Catches Vehicle Details for Upgrading Riders!
router.put('/upload-docs', verifyToken, async (req, res) => {
    try {
        const { cnicFront, cnicBack, vehicleDocs, email, vehicleInfo, licensePlate } = req.body;
        const user = await User.findById(req.user.userId);
        if (email) user.email = email;
        user.driverProfile.cnicFront = cnicFront; 
        user.driverProfile.cnicBack = cnicBack; 
        user.driverProfile.vehicleDocs = vehicleDocs;
        user.driverProfile.vehicleInfo = vehicleInfo; // Save Vehicle
        user.driverProfile.licensePlate = licensePlate; // Save Plate
        user.driverProfile.isApproved = false; 
        await user.save();
        res.status(200).json({ message: "Documents uploaded successfully!", user });
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});

module.exports = router;