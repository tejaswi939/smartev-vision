export interface Mailer {
  sendPasswordReset(email: string, link: string): Promise<void>;
}

// Dev: log to console. Prod: swap for a Resend/SMTP adapter implementing the same interface.
export const mailer: Mailer = {
  async sendPasswordReset(email, link) {
    console.log(`[mailer] password reset for ${email}: ${link}`);
  },
};
