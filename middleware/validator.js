const { check, validationResult , body , param } = require('express-validator');


const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map((err) => ({
                field: err.path,
                message: err.msg,
            })),
        });
    }
    next();
};

const validateRegister = [
    check('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),

    check('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),

    check('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/)
        .withMessage(
            'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
        ),
    check('role')
        .notEmpty()
        .withMessage('Role  is required'),

    validate,
];
const validateLogin = [
    check('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),

    check('password').notEmpty().withMessage('Password is required'),

    validate,
];
const validforgotPassword = [
    check('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),

    validate,
];
const validateMentorProfile = [
  body('age')
    .optional()
    .isInt({ min: 18, max: 100 })
    .withMessage('Age must be between 18 and 100'),
  
  body('proficiency')
    .optional()
    .isIn(['Beginner', 'Intermediate', 'Advanced', 'Expert'])
    .withMessage('Proficiency must be one of: Beginner, Intermediate, Advanced, Expert'),
  
  body('tenthPercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('10th percentage must be between 0 and 100'),
  
  body('twelfthPercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('12th percentage must be between 0 and 100'),
  
  body('locality')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Locality must be between 2 and 100 characters'),
  
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('subjects')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one subject is required'),
  
  body('subjects.*')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Each subject must be between 2 and 50 characters'),
  
  body('classesOffered')
    .optional()
    .isArray()
    .withMessage('Classes offered must be an array'),
  
  body('classesOffered.*.subject')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Subject must be between 2 and 50 characters'),
  
  body('classesOffered.*.standard')
    .optional()
    .isArray()
    .withMessage('Standard must be an array of numbers'),
  
  body('classesOffered.*.standard.*')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Standard must be between 1 and 12'),
  
  body('classesOffered.*.format')
    .optional()
    .isIn(['online', 'offline', 'both'])
    .withMessage('Format must be online, offline, or both'),
  
  body('qualifications')
    .optional()
    .isArray()
    .withMessage('Qualifications must be an array'),
  
  body('qualifications.*.degree')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Degree must be between 2 and 100 characters'),
  
  body('qualifications.*.field')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Field must be between 2 and 100 characters'),
  
  body('qualifications.*.institution')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Institution must be between 2 and 200 characters'),
  
  body('qualifications.*.year')
    .optional()
    .isInt({ min: 1950, max: new Date().getFullYear() })
    .withMessage(`Year must be between 1950 and ${new Date().getFullYear()}`),
  
  body('about')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('About section must be between 10 and 1000 characters')
];
const validateReview = [
  body('comment')
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Comment must be between 5 and 500 characters'),
  
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  param('mentorId')
    .isMongoId()
    .withMessage('Invalid mentor ID')
];
const validateReviewUpdate = [
  body('comment')
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Comment must be between 5 and 500 characters'),
  
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  param('mentorId')
    .isMongoId()
    .withMessage('Invalid mentor ID'),
  
  param('reviewId')
    .isMongoId()
    .withMessage('Invalid review ID')
];
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`)
];

module.exports = { validateRegister, validateLogin ,validforgotPassword ,validateMentorProfile, validateReview, validateReviewUpdate, validateObjectId}