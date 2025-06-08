const Meeting = require('../models/Meeting.model');
const log = require('../config/logger');
const { errorResponse } = require('../utils/response');
const { validationResult } = require('express-validator');

exports.CreateMeeting = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'Validation failed', errors.array());
    }
    const userId = req.user.id;
    const {
      mentorId,
      calendlyEventId,
      eventUri,
      eventName,
      scheduled_start_Time,
      scheduled_end_Time,
      meetingLink,
      source,
      attendeeInfo,
    } = req.body;
    const existing = await Meeting.findOne({ calendlyEventId });
    if (existing) {
      return errorResponse(res, 409, 'Meeting already exists for this Calendly event ID');
    }
    const newMeeting = await Meeting.create({
      userId,
      mentorId,
      calendlyEventId,
      eventUri,
      eventName,
      scheduledTime: {
        start: scheduled_start_Time,
        end: scheduled_end_Time,
      },
      meetingLink,
      source,
      attendeeInfo,
    });
    return successResponse(res, 201, 'Meeting created successfully', newMeeting);
  } catch (error) {
    log.error('Failed to create meeting');
    return errorResponse(res, 503, 'Failed to create meeting');
  }
};
exports.GetmeetingDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let filter = {};
    if (role === 'mentor') {
      filter.mentorId = userId;
    } else if (role === 'user') {
      filter.userId = userId;
    } else {
      return errorResponse(res, 403, 'Access denied');
    }

    const meetings = await Meeting.find(filter).sort({ createdAt: -1 });
    return successResponse(res, 200, 'Meetings fetched successfully', meetings);
  } catch (error) {
    log.error('Failed to fetch meetings:', error);
    return errorResponse(res, 503, 'Failed to fetch meetings');
  }
};
