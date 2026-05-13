const express = require('express');
const Ride = require('../models/Ride');
const User = require('../models/User');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// --- 1. RIDER REQUESTS A RIDE ---
router.post('/request', verifyToken, async (req, res) => {
    try {
        const { pickupLocation, dropoffLocation, offeredFare, vehicleType } = req.body;

        const newRide = new Ride({
            rider: req.user.userId,
            pickupLocation,
            dropoffLocation,
            offeredFare,
            vehicleType: vehicleType || 'Car' // Save the vehicle type!
        });

        await newRide.save();
        req.app.get('io').emit('newRideRequest', newRide);
        res.status(201).json({ message: "Ride requested successfully!", ride: newRide });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
// --- 2. DRIVERS GET AVAILABLE RIDES ---
router.get('/available', verifyToken, async (req, res) => {
    try {
        const rides = await Ride.find({ status: 'pending' })
            .populate('rider', 'name phoneNumber')
            .sort({ createdAt: -1 });
        res.status(200).json(rides);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// --- 3. DRIVER PLACES A BID (COUNTER-OFFER) ---
router.post('/:rideId/bid', verifyToken, async (req, res) => {
    try {
        const { fare } = req.body;
        const ride = await Ride.findById(req.params.rideId);
        if (!ride || ride.status !== 'pending') return res.status(400).json({ message: "Ride not available" });

        const driver = await User.findById(req.user.userId);
        ride.bids.push({ driverId: req.user.userId, fare, driverName: driver.name });
        await ride.save();

        req.app.get('io').emit('newBidUpdate', { rideId: ride._id, bids: ride.bids });
        res.status(200).json({ message: "Bid placed!", ride });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// --- 4. RIDER ACCEPTS A BID ---
router.put('/:rideId/accept', verifyToken, async (req, res) => {
    try {
        const { driverId, acceptedFare } = req.body;
        const ride = await Ride.findById(req.params.rideId);
        
        if (!ride) return res.status(404).json({ message: "Ride not found" });
        if (ride.rider.toString() !== req.user.userId) return res.status(403).json({ message: "Not your ride!" });

        ride.driver = driverId;
        ride.acceptedFare = acceptedFare;
        ride.status = 'accepted';
        await ride.save();

        req.app.get('io').emit('rideAccepted', ride);
        res.status(200).json({ message: "Driver accepted!", ride });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// --- 5. GET ACTIVE RIDE (Secure Data Mode) ---
router.get('/active', verifyToken, async (req, res) => {
    try {
        const activeRide = await Ride.findOne({
            $or:[{ rider: req.user.userId }, { driver: req.user.userId }],
            status: { $in:['accepted', 'in_transit'] }
        })
        // ✨ PRIVACY FIX: We explicitly ask for names and vehicle info, but EXCLUDE phone numbers! ✨
        .populate('rider', 'firstName lastName name') 
        .populate('driver', 'firstName lastName name driverProfile.vehicleInfo driverProfile.licensePlate');

        res.status(200).json(activeRide);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

// --- 6. DRIVER COMPLETES THE RIDE ---
router.put('/:rideId/complete', verifyToken, async (req, res) => {
    try {
        const ride = await Ride.findById(req.params.rideId);
        if (!ride) return res.status(404).json({ message: "Ride not found" });

        if (ride.driver.toString() !== req.user.userId) {
            return res.status(403).json({ message: "Not your assigned ride!" });
        }

        ride.status = 'completed';
        await ride.save();

        req.app.get('io').emit('rideCompleted', ride);
        res.status(200).json({ message: "Ride completed successfully!", ride });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});
// --- 7. GET RIDE HISTORY & EARNINGS ---
router.get('/history', verifyToken, async (req, res) => {
    try {
        // Find all COMPLETED rides involving this user
        const history = await Ride.find({
            $or:[{ rider: req.user.userId }, { driver: req.user.userId }],
            status: 'completed'
        })
        .populate('rider', 'name')
        .populate('driver', 'name')
        .sort({ updatedAt: -1 }); // Newest first!

        // Calculate total earnings if they were the driver
        let driverEarnings = 0;
        history.forEach(ride => {
            if (ride.driver && ride.driver._id.toString() === req.user.userId) {
                driverEarnings += ride.acceptedFare;
            }
        });

        res.status(200).json({ history, driverEarnings });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
module.exports = router;