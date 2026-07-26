// Mock Email Service
export const EmailService = {
  async sendInvoice(email, invoiceId) {
    console.log(`[EMAIL] Sending invoice ${invoiceId} to ${email}`);
    return true;
  },

  async sendPaymentReminder(email, invoiceId) {
    console.log(`[EMAIL] Sending payment reminder for ${invoiceId} to ${email}`);
    return true;
  },

  async sendWelcomeEmail(email, name) {
    console.log(`[EMAIL] Sending welcome email to ${name} (${email})`);
    return true;
  },

  async sendPasswordReset(email, resetToken) {
    console.log(`[EMAIL] Sending password reset token ${resetToken} to ${email}`);
    return true;
  }
};
