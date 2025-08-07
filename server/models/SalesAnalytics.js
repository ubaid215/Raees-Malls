const salesAnalyticsSchema = new mongoose.Schema({
  salesId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sales' },
  date: { type: Date, default: Date.now },
  views: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 }
});