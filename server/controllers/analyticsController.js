"use strict";

/**
 * Analytics Controller — Admin Only
 *
 * Provides aggregated business metrics for the admin dashboard:
 * - Total, upcoming, completed, cancelled counts
 * - Revenue metrics (total completed revenue, projected revenue)
 * - Service popularity breakdown
 * - Therapist appointment breakdown
 * - Weekly appointment distribution
 */

const mongoose = require("mongoose");
const { normalizeToDateOnly } = require("../services/bookingService");

/**
 * GET /api/admin/analytics
 */
async function getAdminAnalytics(req, res, next) {
  try {
    const Booking = mongoose.model("Booking");
    const Service = mongoose.model("Service");
    const Therapist = mongoose.model("Therapist");

    const now = new Date();
    const today = normalizeToDateOnly(now);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Run parallel queries
    const [
      totalBookings,
      pendingCount,
      confirmedCount,
      completedCount,
      cancelledCount,
      noShowCount,
      todayBookings,
      upcomingBookings,
      completedBookingsList,
      serviceBreakdown,
      therapistBreakdown,
    ] = await Promise.all([
      Booking.countDocuments(),
      Booking.countDocuments({ status: "pending" }),
      Booking.countDocuments({ status: "confirmed" }),
      Booking.countDocuments({ status: "completed" }),
      Booking.countDocuments({ status: "cancelled" }),
      Booking.countDocuments({ status: "no_show" }),
      Booking.countDocuments({
        appointmentDate: { $gte: today, $lt: tomorrow },
        status: { $in: ["pending", "confirmed"] },
      }),
      Booking.countDocuments({
        appointmentDate: { $gte: today },
        status: { $in: ["pending", "confirmed"] },
      }),
      Booking.find({ status: "completed" }).select("price duration"),
      Booking.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: "$service",
            serviceName: { $first: "$serviceName" },
            count: { $sum: 1 },
            totalRevenue: { $sum: "$price" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Booking.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: "$therapist",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    const completedRevenue = completedBookingsList.reduce(
      (sum, b) => sum + (b.price || 0),
      0
    );

    // Populate therapist details in aggregate if needed
    const populatedTherapists = await Therapist.populate(therapistBreakdown, {
      path: "_id",
      select: "user bio specializations",
      populate: { path: "user", select: "firstName lastName email" },
    });

    const therapistStats = populatedTherapists.map((item) => ({
      therapistId: item._id?._id,
      name: item._id?.user
        ? `${item._id.user.firstName} ${item._id.user.lastName}`.trim()
        : "Unknown Therapist",
      count: item.count,
    }));

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalBookings,
          upcoming: upcomingBookings,
          today: todayBookings,
          pending: pendingCount,
          confirmed: confirmedCount,
          completed: completedCount,
          cancelled: cancelledCount,
          noShow: noShowCount,
          completedRevenue,
        },
        topServices: serviceBreakdown.map((s) => ({
          serviceId: s._id,
          name: s.serviceName || "Service",
          count: s.count,
          revenue: s.totalRevenue,
        })),
        therapists: therapistStats,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAdminAnalytics,
};
