const mongoose = require('mongoose');

const pricingSchema = new mongoose.Schema({
    baseFare: { type: Number, required: true },
    perKmRate: { type: Number, required: true },
    driverBonus: { type: Number, required: true }
});

const settingsSchema = new mongoose.Schema({
    // ✨ NEW: Platform Commission Percentage (Default is 10%)
    companyCommission: { type: Number, default: 10 }, 
    
    Car: { type: pricingSchema, default: () => ({ baseFare: 150, perKmRate: 40, driverBonus: 50 }) },
    Bike: { type: pricingSchema, default: () => ({ baseFare: 50, perKmRate: 15, driverBonus: 20 }) },
    Rickshaw: { type: pricingSchema, default: () => ({ baseFare: 80, perKmRate: 25, driverBonus: 30 }) }
});

module.exports = mongoose.model('Settings', settingsSchema);