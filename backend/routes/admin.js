const express = require('express');
const User = require('../models/User');
const Ride = require('../models/Ride');
const verifyToken = require('../middleware/authMiddleware');
const Settings = require('../models/Settings');
const router = express.Router();

// --- 1. GET ALL USERS ---
router.get('/users', verifyToken, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// --- 2. APPROVE A DRIVER ---
router.put('/approve-driver/:id', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Change their status to approved!
        user.driverProfile.isApproved = true;
        await user.save();

        res.status(200).json({ message: "Driver approved successfully!", user });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// --- 3. GET ALL PLATFORM RIDES ---
router.get('/rides', verifyToken, async (req, res) => {
    try {
        const rides = await Ride.find()
            .populate('rider', 'name email')
            .populate('driver', 'name email')
            .sort({ createdAt: -1 });
        res.status(200).json(rides);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
// --- 4. DELETE A USER ---
router.delete('/users/:id', verifyToken, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// --- 5. FORCE UPDATE A RIDE STATUS ---
router.put('/rides/:id/status', verifyToken, async (req, res) => {
    try {
        const { status } = req.body; // 'completed' or 'canceled'
        
        const ride = await Ride.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!ride) return res.status(404).json({ message: "Ride not found" });

        // 🟢 SOCKET MAGIC: Tell the phones that the Admin intervened!
        if (status === 'completed' || status === 'canceled') {
            req.app.get('io').emit('rideCompleted', ride); // This resets the phones!
        }

        res.status(200).json({ message: `Ride marked as ${status}!`, ride });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
// --- 6. GET PRICING SETTINGS (Public so Mobile App can read them) ---
router.get('/settings', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) settings = await Settings.create({}); // Create defaults if empty
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// --- 7. UPDATE PRICING SETTINGS (Admin Only) ---
router.put('/settings', verifyToken, async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) settings = new Settings();
        
        // ✨ NEW: Save the Company Commission!
        settings.companyCommission = req.body.companyCommission;
        
        settings.Car = req.body.Car;
        settings.Bike = req.body.Bike;
        settings.Rickshaw = req.body.Rickshaw;
        
        await settings.save();
        res.status(200).json(settings);
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});
// --- 8. SUSPEND/UNSUSPEND USER ---
router.put('/users/:id/suspend', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        
        // We will toggle their driver approval off as a "suspension"
        if (user.driverProfile) {
            user.driverProfile.isApproved = false;
        }
        await user.save();
        res.status(200).json({ message: "User suspended!", user });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// --- 9. DELETE A RIDE FROM HISTORY ---
router.delete('/rides/:id', verifyToken, async (req, res) => {
    try {
        await Ride.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Ride deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
module.exports = router;