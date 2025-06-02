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

    case 'apiKeyGenerated':
      return `
         <div style="max-width: 600px; margin: 0 auto; padding: 10px; font-family: Arial, sans-serif; background-color : #f5f7f5;">
      
            <h2>New API Key Generated</h2>
            <p>Hello ${data.name},</p>
            <p>Your new API key has been generated:</p>
            <div style="background-color: #f5f5f5; padding: 12px; border-radius: 4px; margin: 16px 0;">
              <code style="word-break: break-all;">${data.apiKey}</code>
            </div>
            <p>Please keep this key secure and do not share it with anyone.</p>
            <p>Your previous API key has been invalidated.</p>
       
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

  <p style="margin-top: 24px;">Best regards,<br />The CraftFossLabs Team</p>

  <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;" />

  <small style="color: #777;">This is an automated message. Please do not reply directly to this email.</small>
 <img src="${constants.SERVER_URL}/uploads/assets/Footer.webp" alt="Footer Image" style="width: 100%; max-width: 600px; display: block;" />
          </div>
      `;

    case 'taskboard':
      return `
           <div style="max-width: 600px; margin: 0 auto; padding: 10px; font-family: Arial, sans-serif; background-color : #f5f7f5;">
          
              <h2 style="color: #2c3e50;">TaskBoard Status</h2>

              <div style="display: flex; justify-content: space-between; align-items: center; background-color: #ffffff; padding: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 20px;">
         
                  <div style="text-align: center;">
                    <img src="${data.assignedBy?.avatar || constants.DEFAULT_AVATAR}" alt="${data.assignedBy?.name}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;" />
                    <p style="margin-top: 8px; font-size: 14px; color: #2c3e50;">${data.assignedBy?.name || 'Assigned By'}</p>
                  </div>
    
                  <div style="flex: 1; text-align: center;">
                    <hr style="border: none; border-top: 2px solid #3498db; width: 100%; position: relative; top: 50%; margin: 0 8px;" />
                    <span style="position: relative; top: -12px; font-size: 24px; color: #3498db;">→</span>
                  </div>
          
                  <div style="text-align: center;">
                    <img src="${data.assignedTo?.avatar || constants.DEFAULT_AVATAR}" alt="${data.assignedTo?.name}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;" />
                    <p style="margin-top: 8px; font-size: 14px; color: #2c3e50;">${data.assignedTo?.name || 'Assigned To'}</p>
                  </div>
              </div>
              ${data.html}
               
              <a href="${data.url}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
                Go To Your Dashboard
              </a>

              <hr style="margin: 24px 0; border: none; border-top: 1px solid #ddd;" /> 
              <small style="color: #777;">This is an automated message. Please do not reply directly to this email.</small>
           
          </div>
      `;
    default:
      return `<p>No template found for email type: ${type}</p>`;
  }
};
module.exports = getEmailTemplate;
