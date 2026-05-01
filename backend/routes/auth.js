const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// --- 1. REGISTER ---
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phoneNumber } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name, email, phoneNumber, password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({ message: "Account created successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// --- 2. LOGIN ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid email or password" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

        // We put their activeRole in the VIP Pass!
        const token = jwt.sign({ userId: user._id, activeRole: user.activeRole }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({ message: "Login successful", token, user });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// --- 3. SWITCH TO DRIVER / RIDER ---
router.put('/switch-role', verifyToken, async (req, res) => {
    try {
        const { newRole } = req.body; // 'rider' or 'driver'

        const user = await User.findById(req.user.userId);
        
        // If they want to be a driver, we can check if admin approved them!
       // if (newRole === 'driver' && !user.driverProfile.isApproved) {
          //  return res.status(403).json({ message: "You must be approved by an Admin to drive." });
      //  }

        user.activeRole = newRole;
        await user.save();

        // Generate a fresh token with their new role!
        const newToken = jwt.sign({ userId: user._id, activeRole: user.activeRole }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({ message: `Successfully switched to ${newRole} mode!`, token: newToken, user });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;