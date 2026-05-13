const express = require('express');
const Ride = require('../models/Ride');
const User = require('../models/User');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/request', verifyToken, async (req, res) => {
    try {
        const { pickupLocation, dropoffLocation, offeredFare, vehicleType } = req.body;
        const newRide = new Ride({ rider: req.user.userId, pickupLocation, dropoffLocation, offeredFare, vehicleType: vehicleType || 'Car' });
        await newRide.save();
        req.app.get('io').emit('newRideRequest', newRide);
        res.status(201).json({ message: "Ride requested successfully!", ride: newRide });
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});

router.get('/available', verifyToken, async (req, res) => {
    try {
        const rides = await Ride.find({ status: 'pending' }).populate('rider', 'name firstName phoneNumber').sort({ createdAt: -1 });
        res.status(200).json(rides);
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});

router.post('/:rideId/bid', verifyToken, async (req, res) => {
    try {
        const { fare } = req.body;
        const ride = await Ride.findById(req.params.rideId);
        if (!ride || ride.status !== 'pending') return res.status(400).json({ message: "Ride not available" });

        const driver = await User.findById(req.user.userId);
        
        // Remove old bid if driver is re-bidding
        ride.bids = ride.bids.filter(b => b.driverId.toString() !== req.user.userId);
        ride.bids.push({ driverId: req.user.userId, fare, driverName: driver.firstName || driver.name });
        
        await ride.save();
        req.app.get('io').emit('newBidUpdate', { rideId: ride._id, bids: ride.bids });
        res.status(200).json({ message: "Bid placed!", ride });
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});

// ✨ NEW: RIDER REJECTS A SPECIFIC BID ✨
router.put('/:rideId/bid/reject', verifyToken, async (req, res) => {
    try {
        const { driverId } = req.body;
        const ride = await Ride.findById(req.params.rideId);
        if (!ride) return res.status(404).json({ message: "Ride not found" });

        // Remove that specific driver's bid
        ride.bids = ride.bids.filter(b => b.driverId.toString() !== driverId);
        await ride.save();

        // 1. Tell the Rider to update their list
        req.app.get('io').emit('newBidUpdate', { rideId: ride._id, bids: ride.bids });
        // 2. Tell that SPECIFIC driver they got rejected so they can bid again!
        req.app.get('io').emit(`bidRejected-${driverId}`, { rideId: ride._id });

        res.status(200).json({ message: "Bid rejected" });
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});

router.put('/:rideId/accept', verifyToken, async (req, res) => {
    try {
        const { driverId, acceptedFare } = req.body;
        const ride = await Ride.findById(req.params.rideId);
        
        if (!ride) return res.status(404).json({ message: "Ride not found" });

        ride.driver = driverId;
        ride.acceptedFare = acceptedFare;
        ride.status = 'accepted';
        await ride.save();

        // Tell the whole network the ride is gone
        req.app.get('io').emit('rideAcceptedGlobal', ride);
        // Tell this EXACT driver that they won the bid!
        req.app.get('io').emit(`youWonTheBid-${driverId}`, ride);

        res.status(200).json({ message: "Driver accepted!", ride });
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});

// ✨ NEW: LIFECYCLE STATUS UPDATES (Arrived, Start, End) ✨
router.put('/:rideId/status', verifyToken, async (req, res) => {
    try {
        const { status } = req.body; // 'arrived', 'in_progress', 'completed'
        const ride = await Ride.findByIdAndUpdate(req.params.rideId, { status }, { new: true });
        
        // Beam the live status update to the Rider's phone!
        req.app.get('io').emit(`rideStatusUpdate-${ride._id}`, ride);
        
        res.status(200).json(ride);
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});

// ✨ NEW: RIDER RATES THE DRIVER ✨
router.post('/:rideId/rate', verifyToken, async (req, res) => {
    try {
        const { rating } = req.body;
        const ride = await Ride.findByIdAndUpdate(req.params.rideId, { rating }, { new: true });
        res.status(200).json({ message: "Thank you for your feedback!" });
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});

router.get('/active', verifyToken, async (req, res) => {
    try {
        const activeRide = await Ride.findOne({
            $or:[{ rider: req.user.userId }, { driver: req.user.userId }],
            status: { $in:['accepted', 'arrived', 'in_progress'] } // ✨ Includes new statuses!
        })
        .populate('rider', 'firstName lastName name') 
        .populate('driver', 'firstName lastName name driverProfile.vehicleInfo driverProfile.licensePlate');

        res.status(200).json(activeRide);
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});

router.get('/history', verifyToken, async (req, res) => {
    try {
        const history = await Ride.find({
            $or:[{ rider: req.user.userId }, { driver: req.user.userId }],
            status: 'completed'
        })
        .populate('rider', 'name firstName')
        .populate('driver', 'name firstName')
        .sort({ updatedAt: -1 });

        let driverEarnings = 0;
        history.forEach(ride => {
            if (ride.driver && ride.driver._id.toString() === req.user.userId) driverEarnings += ride.acceptedFare;
        });

        res.status(200).json({ history, driverEarnings });
    } catch (error) { res.status(500).json({ message: "Server error" }); }
});

module.exports = router;