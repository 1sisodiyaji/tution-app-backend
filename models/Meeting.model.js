const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    calendlyEventId: {
      type: String,
      required: true,
      unique: true,
    },
    eventUri: {
      type: String,
      required: true,
    },
    eventName: {
      type: String,
      required: true,
    },
    scheduledTime: {
      start: {
        type: Date,
        required: true,
      },
      end: {
        type: Date,
        required: true,
      },
    },
    meetingLink: {
      type: String,
      default: null,
    },
    source: {
      type: String,
      enum: ['website', 'mobile_app', 'admin'],
      default: 'website',
      required: true,
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'completed', 'no_show'],
      default: 'confirmed',
    },
    attendeeInfo: {
      name: String,
      email: String,
      timezone: String,
      responses: [
        {
          question: String,
          answer: String,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

meetingSchema.index({ mentorId: 1, scheduledTime: 1 });
meetingSchema.index({ userId: 1, scheduledTime: 1 });
meetingSchema.index({ createdAt: -1 });

const Meeting = mongoose.model('Meeting', meetingSchema);
module.exports = Meeting;
