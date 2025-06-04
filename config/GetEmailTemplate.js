const getEmailTemplate = (type, data) => {
  switch (type) {
    case 'verification':
      return `
          <div style="max-width: 600px; margin: 0 auto; padding: 10px; font-family: Arial, sans-serif; background-color : #f5f7f5;">
           <h2>Verify Your Email</h2>
            <p>Hello ${data.name},</p>
            <p>Please click the button below to verify your email address:</p>
            <a href="${data.verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
              Verify Email
            </a>
            <p>If the button doesn't work, you can also click this link:</p>
            <p>${data.verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
          
          </div>
        `;

    case 'resetPassword':
      return `
          <div style="max-width: 600px; margin: 0 auto; padding: 10px; font-family: Arial, sans-serif; background-color : #f5f7f5;">
      
            <h2>Reset Your Password</h2>
            <p>Hello ${data.name},</p>
            <p>You requested to reset your password. Please click the button below to set a new password:</p>
            <a href="${data.resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
              Reset Password
            </a>
            <p>If the button doesn't work, you can also click this link:</p>
            <p>${data.resetUrl}</p>
            <p>This link will expire in 15 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
      
          </div>
        `;
    
    case 'passwordResetSuccess':
      return `
          <div style="max-width: 600px; margin: 0 auto; padding: 10px; font-family: Arial, sans-serif; background-color : #f5f7f5;">
      
            <h2>Your Password Get Changed</h2>
            <p>Hello ${data.name},</p>
            <p>Your Password Get Changed Please Login:</p>
             <a href="${data.loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
              Login
            </a>
            <p>If the button doesn't work, you can also click this link:</p>
            <p>${data.loginUrl}</p>
            <p>Be Secure Do not Share your Password.</p>
            <p>If you didn't request this, please ignore this email.</p>
        
          </div>
          `;

    case 'feedback':
      return `
     <div style="max-width: 600px; margin: 0 auto; padding: 10px; font-family: Arial, sans-serif; background-color : #f5f7f5;">
      
            <h2 style="color: #2c3e50;">Feedback Received</h2>

  <p>Hi ${data.name},</p>

  <p>Thank you for taking the time to share your feedback with us. We've successfully received your message and truly appreciate your input!</p>

  <div style="margin: 20px 0; padding: 16px; background-color: #ffffff; border-left: 4px solid #3498db;">
    <p style="margin: 0;"><strong>Subject:</strong> ${data.subject}</p>
    <p style="margin: 0;"><strong>Message:</strong> ${data.message}</p>
  </div>

  <p>We’re always looking to improve, and your feedback helps us do just that.</p>

  <p>If you didn’t send this message, you can safely ignore this email.</p>

  <p style="margin-top: 24px;">Best regards,<br />The Logo Team</p>

  <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;" />

  <small style="color: #777;">This is an automated message. Please do not reply directly to this email.</small>
 <img src="${constants.SERVER_URL}/uploads/assets/Footer.webp" alt="Footer Image" style="width: 100%; max-width: 600px; display: block;" />
          </div>
      `;

    default:
      return `<p>No template found for email type: ${type}</p>`;
  }
};
module.exports = getEmailTemplate;
