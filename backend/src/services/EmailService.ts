import nodemailer from 'nodemailer';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter | null = null;
  private sesClient: SESClient | null = null;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly provider: 'ses' | 'smtp' | 'sendgrid' | 'console';

  private constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@warren.ai';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Warren Finance';
    this.provider = (process.env.EMAIL_PROVIDER as 'ses' | 'smtp' | 'sendgrid' | 'console') || 'smtp';

    this.initialize();
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private initialize() {
    switch (this.provider) {
      case 'ses':
        this.initializeAWSSES();
        break;
      case 'smtp':
        this.initializeSMTP();
        break;
      case 'sendgrid':
        this.initializeSendGrid();
        break;
      case 'console':
        logger.info('Email service initialized in console mode (for development)');
        break;
    }
  }

  private initializeAWSSES() {
    this.sesClient = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
  }

  private initializeSMTP() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  private initializeSendGrid() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  }

  /**
   * Send email using configured provider
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      if (this.provider === 'console') {
        await this.sendWithConsole(options);
      } else if (this.provider === 'ses' && this.sesClient) {
        await this.sendWithSES(options);
      } else if (this.transporter) {
        await this.sendWithNodemailer(options);
      } else {
        throw new Error('Email service not configured');
      }

      logger.info(`Email sent successfully to ${options.to}`);
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  private async sendWithSES(options: EmailOptions): Promise<void> {
    const command = new SendEmailCommand({
      Source: `${this.fromName} <${this.fromEmail}>`,
      Destination: {
        ToAddresses: [options.to]
      },
      Message: {
        Subject: {
          Data: options.subject
        },
        Body: {
          Html: {
            Data: options.html
          },
          Text: {
            Data: options.text || this.htmlToText(options.html)
          }
        }
      }
    });

    await this.sesClient!.send(command);
  }

  private async sendWithNodemailer(options: EmailOptions): Promise<void> {
    await this.transporter!.sendMail({
      from: `${this.fromName} <${this.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || this.htmlToText(options.html),
      attachments: options.attachments
    });
  }

  private async sendWithConsole(options: EmailOptions): Promise<void> {
    console.log('\n=== EMAIL (CONSOLE MODE) ===');
    console.log(`From: ${this.fromName} <${this.fromEmail}>`);
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('--- TEXT ---');
    console.log(options.text || this.htmlToText(options.html));
    console.log('--- HTML ---');
    console.log(options.html);
    console.log('=========================\n');
  }

  /**
   * Send user invitation email
   */
  async sendInvitation(
    email: string,
    inviterName: string,
    companyName: string,
    invitationToken: string,
    role: string
  ): Promise<void> {
    const invitationUrl = `${process.env.FRONTEND_URL}/accept-invitation?token=${invitationToken}`;
    const template = this.getTemplate('invitation', {
      inviterName,
      companyName,
      role: this.formatRole(role),
      invitationUrl,
      email
    });

    await this.sendEmail({
      to: email,
      ...template
    });
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(
    email: string,
    verificationToken: string
  ): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const template = this.getTemplate('emailVerification', {
      verificationUrl,
      email
    });

    await this.sendEmail({
      to: email,
      ...template
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(
    email: string,
    resetToken: string,
    userName?: string
  ): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const template = this.getTemplate('passwordReset', {
      resetUrl,
      userName: userName || email,
      expiryHours: 2
    });

    await this.sendEmail({
      to: email,
      ...template
    });
  }

  /**
   * Send 2FA enabled notification
   */
  async send2FAEnabledNotification(email: string): Promise<void> {
    const template = this.getTemplate('2faEnabled', {
      email,
      supportEmail: 'support@warren.ai'
    });

    await this.sendEmail({
      to: email,
      ...template
    });
  }

  /**
   * Send 2FA disabled notification
   */
  async send2FADisabledNotification(email: string): Promise<void> {
    const template = this.getTemplate('2faDisabled', {
      email,
      supportEmail: 'support@warren.ai'
    });

    await this.sendEmail({
      to: email,
      ...template
    });
  }

  /**
   * Send license expiry warning
   */
  async sendLicenseExpiryWarning(
    adminEmails: string[],
    companyName: string,
    expiryDate: Date,
    daysRemaining: number
  ): Promise<void> {
    const template = this.getTemplate('licenseExpiry', {
      companyName,
      expiryDate: expiryDate.toLocaleDateString(),
      daysRemaining,
      renewUrl: `${process.env.FRONTEND_URL}/settings/billing`
    });

    // Send to all company admins
    await Promise.all(
      adminEmails.map(email => 
        this.sendEmail({ to: email, ...template })
      )
    );
  }

  /**
   * Send user limit reached notification
   */
  async sendUserLimitReached(
    adminEmails: string[],
    companyName: string,
    currentLimit: number
  ): Promise<void> {
    const template = this.getTemplate('userLimitReached', {
      companyName,
      currentLimit,
      upgradeUrl: `${process.env.FRONTEND_URL}/settings/billing`
    });

    await Promise.all(
      adminEmails.map(email => 
        this.sendEmail({ to: email, ...template })
      )
    );
  }

  /**
   * Get email template
   */
  private getTemplate(templateName: string, variables: Record<string, any>): EmailTemplate {
    const templates: Record<string, (vars: any) => EmailTemplate> = {
      invitation: (vars) => ({
        subject: `You've been invited to join ${vars.companyName} on Warren`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #7CB342; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f4f4f4; }
              .button { display: inline-block; padding: 12px 24px; background-color: #7CB342; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
              .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Warren Finance</h1>
              </div>
              <div class="content">
                <h2>You're Invited!</h2>
                <p>Hi there,</p>
                <p><strong>${vars.inviterName}</strong> has invited you to join <strong>${vars.companyName}</strong> on Warren as a <strong>${vars.role}</strong>.</p>
                <p>Warren is a secure financial management platform that helps teams collaborate on financial data and insights.</p>
                <p>Click the button below to accept your invitation and set up your account:</p>
                <center>
                  <a href="${vars.invitationUrl}" class="button">Accept Invitation</a>
                </center>
                <p>This invitation will expire in 7 days.</p>
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
              </div>
              <div class="footer">
                <p>© 2025 Warren Finance. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `You've been invited to join ${vars.companyName} on Warren!\n\n${vars.inviterName} has invited you to join as a ${vars.role}.\n\nAccept your invitation: ${vars.invitationUrl}\n\nThis invitation will expire in 7 days.`
      }),

      emailVerification: (vars) => ({
        subject: 'Verify your Warren account email',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #7CB342; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f4f4f4; }
              .button { display: inline-block; padding: 12px 24px; background-color: #7CB342; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Verify Your Email</h1>
              </div>
              <div class="content">
                <p>Thanks for signing up for Warren! Please verify your email address to complete your registration.</p>
                <center>
                  <a href="${vars.verificationUrl}" class="button">Verify Email</a>
                </center>
                <p>If you didn't create an account, you can safely ignore this email.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Verify your Warren account\n\nPlease verify your email address: ${vars.verificationUrl}`
      }),

      passwordReset: (vars) => ({
        subject: 'Reset your Warren password',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #7CB342; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f4f4f4; }
              .button { display: inline-block; padding: 12px 24px; background-color: #7CB342; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
              .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hi ${vars.userName},</p>
                <p>We received a request to reset your Warren password. Click the button below to create a new password:</p>
                <center>
                  <a href="${vars.resetUrl}" class="button">Reset Password</a>
                </center>
                <div class="warning">
                  <p><strong>Important:</strong> This link will expire in ${vars.expiryHours} hours.</p>
                </div>
                <p>If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Reset your Warren password\n\nReset link: ${vars.resetUrl}\n\nThis link expires in ${vars.expiryHours} hours.`
      }),

      '2faEnabled': (vars) => ({
        subject: 'Two-factor authentication enabled',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #7CB342; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f4f4f4; }
              .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 10px; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Security Update</h1>
              </div>
              <div class="content">
                <div class="success">
                  <p><strong>✓ Two-factor authentication has been enabled</strong></p>
                </div>
                <p>Your Warren account is now protected with two-factor authentication.</p>
                <p>You'll need to enter a verification code from your authenticator app each time you sign in.</p>
                <p>If you didn't enable 2FA, please contact us immediately at ${vars.supportEmail}</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Two-factor authentication enabled\n\nYour Warren account is now protected with 2FA.\n\nIf you didn't enable this, contact ${vars.supportEmail}`
      }),

      '2faDisabled': (vars) => ({
        subject: 'Two-factor authentication disabled',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f4f4f4; }
              .warning { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Security Alert</h1>
              </div>
              <div class="content">
                <div class="warning">
                  <p><strong>⚠ Two-factor authentication has been disabled</strong></p>
                </div>
                <p>Two-factor authentication has been removed from your Warren account.</p>
                <p>Your account is now less secure. We strongly recommend re-enabling 2FA.</p>
                <p>If you didn't disable 2FA, your account may be compromised. Please:</p>
                <ol>
                  <li>Change your password immediately</li>
                  <li>Re-enable 2FA</li>
                  <li>Contact support at ${vars.supportEmail}</li>
                </ol>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `Security Alert: 2FA disabled\n\nTwo-factor authentication has been removed from your account.\n\nIf you didn't do this, contact ${vars.supportEmail} immediately.`
      }),

      licenseExpiry: (vars) => ({
        subject: `License expiring soon - ${vars.companyName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #ffc107; color: #333; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f4f4f4; }
              .button { display: inline-block; padding: 12px 24px; background-color: #7CB342; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>License Expiry Notice</h1>
              </div>
              <div class="content">
                <p>Your Warren license for <strong>${vars.companyName}</strong> will expire in <strong>${vars.daysRemaining} days</strong>.</p>
                <p>Expiry date: <strong>${vars.expiryDate}</strong></p>
                <p>To ensure uninterrupted access to Warren, please renew your license:</p>
                <center>
                  <a href="${vars.renewUrl}" class="button">Renew License</a>
                </center>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `License expiring soon\n\n${vars.companyName} license expires in ${vars.daysRemaining} days (${vars.expiryDate}).\n\nRenew: ${vars.renewUrl}`
      }),

      userLimitReached: (vars) => ({
        subject: `User limit reached - ${vars.companyName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background-color: #f4f4f4; }
              .button { display: inline-block; padding: 12px 24px; background-color: #7CB342; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>User Limit Reached</h1>
              </div>
              <div class="content">
                <p><strong>${vars.companyName}</strong> has reached its user limit of <strong>${vars.currentLimit} users</strong>.</p>
                <p>To add more team members, please upgrade your subscription:</p>
                <center>
                  <a href="${vars.upgradeUrl}" class="button">Upgrade Plan</a>
                </center>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `User limit reached\n\n${vars.companyName} has reached its limit of ${vars.currentLimit} users.\n\nUpgrade: ${vars.upgradeUrl}`
      })
    };

    const templateFn = templates[templateName];
    if (!templateFn) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    return templateFn(variables);
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Format role name for display
   */
  private formatRole(role: string): string {
    const roleMap: Record<string, string> = {
      'company_admin': 'Company Administrator',
      'company_employee': 'Team Member',
      'platform_admin': 'Platform Administrator'
    };
    return roleMap[role] || role;
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(): Promise<boolean> {
    try {
      await this.sendEmail({
        to: process.env.TEST_EMAIL || this.fromEmail,
        subject: 'Warren Email Configuration Test',
        html: '<p>This is a test email to verify your email configuration.</p>',
        text: 'This is a test email to verify your email configuration.'
      });
      return true;
    } catch (error) {
      logger.error('Email configuration test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();