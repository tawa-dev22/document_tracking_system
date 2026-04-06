import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (env.smtp.host && env.smtp.user && env.smtp.pass) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass
      }
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }

  return transporter;
}

const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { margin-bottom: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
    .button { display: inline-block; padding: 12px 24px; background-color: #0f172a; color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 600; margin: 20px 0; }
    .otp { font-size: 32px; font-weight: 700; color: #0f172a; letter-spacing: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin:0;color:#0f172a;">Document Tracking System</h2>
      <p style="margin:5px 0 0;font-size:12px;color:#64748b;">Ministry of Finance and Economic Development</p>
    </div>
    ${content}
    <div class="footer">
      <p>This is an automated message. Please do not reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} Ministry of Finance and Economic Development and Investment Promotion. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

export async function sendOtpEmail({ to, fullName, subject, otp, purpose }) {

  try {
    const transport = getTransporter();
    const html = baseTemplate(`
      <p>Hello ${fullName},</p>
      <p>You requested a one-time password for <strong>${purpose}</strong>. Please use the following code:</p>
      <div class="otp">${otp}</div>
      <p>This code is valid for <strong>10 minutes</strong>. If you did not request this, you can safely ignore this email.</p>
    `);

    const info = await transport.sendMail({
      from: `Notification <${env.smtp.from}>`,
      to,
      subject,
      text: `Hello ${fullName},\n\nYour one-time password for ${purpose} is ${otp}. It expires in 10 minutes.`,
      html,
      headers: {
        'X-Entity-Ref-Type': 'OTP-Verification',
        'X-Priority': '1 (Highest)',
        'Importance': 'High'
      }
    });

    if (env.nodeEnv !== 'production' && info.message) {
      console.log('Email preview (json transport):', info.message.toString());
    }

    return info;
  } catch (error) {
    console.error('Email sending failed:', error.message);
    if (env.nodeEnv !== 'production') {
      return { success: false, messageId: 'dev_mock_id' };
    }

    throw new Error('Failed to send OTP email. Please try again later.');
  }
}

export async function sendDocumentSharedEmail({ to, documentTitle, senderName, isRegistered = true, documentId }) {
  try {
    const transport = getTransporter();
    const loginUrl = `${env.clientUrl}/login`;
    const registerUrl = `${env.clientUrl}/register?email=${encodeURIComponent(to)}`;
    const docUrl = `${env.clientUrl}/documents/${documentId}`;

    let content = `<p>Hello,</p><p>This is an automated notification from the Document Tracking System.</p><p><strong>${senderName || 'Authorized personnel'}</strong> has formally routed a document to you for review or action: <strong>"${documentTitle}"</strong></p>`;

    let textFallback = `Hello,\n\n${senderName || 'Authorized personnel'} has routed the document "${documentTitle}" to you.\n\n`;

    if (isRegistered) {
      content += `
        <p>Your account possesses the necessary clearings to access and manage this record.</p>
        <div style="margin: 25px 0;">
          <a href="${docUrl}" class="button">Access Document Archive</a>
        </div>
        <p style="font-size: 11px; color: #64748b; margin-top: 20px;">If the interactive button is disabled by your mail client, securely copy and paste this URL: ${docUrl}</p>
      `;
      textFallback += `Access the document here: ${docUrl}`;
    } else {
      content += `
        <div style="background-color: #f8fafc; padding: 20px; border-left: 4px solid #3b82f6; margin: 25px 0; border-radius: 4px;">
          <h3 style="margin-top: 0; color: #0f172a; font-size: 16px;">System Invitation Required</h3>
          <p style="margin-bottom: 0;">You are not currently registered in the tracking database. To securely view this internal document and participate in its workflow, you must register a certified account using this exact email address.</p>
        </div>
        <div style="margin: 25px 0;">
          <a href="${registerUrl}" class="button">Create Secure Account</a>
        </div>
        <p style="font-size: 12px; color: #475569;">Upon identity confirmation, your profile will immediately sync and grant you tracing capabilities for this document.</p>
        <p style="font-size: 11px; color: #64748b; margin-top: 20px;">Alternative registration URL: ${registerUrl}</p>
      `;
      textFallback += `You are not registered in the system. To view this document, you must first create an account: ${registerUrl}`;
    }

    const info = await transport.sendMail({
      from: `Registry Alerts <${env.smtp.from}>`,
      to,
      subject: isRegistered 
        ? `Internal Document Routed: ${documentTitle}` 
        : `Action Required: Invitation to Access Document "${documentTitle}"`,
      text: textFallback,
      html: baseTemplate(content),
      headers: {
        'X-Entity-Ref-Type': 'Document-Routing-Alert',
        'X-Priority': '3 (Normal)',
        'List-Unsubscribe': `<mailto:${env.smtp.from}?subject=unsubscribe>`
      }
    });

    if (env.nodeEnv !== 'production' && info.message) {
      console.log('Document shared email preview (json transport):', info.message.toString());
    }

    return info;
  } catch (error) {
    console.error('Shared document email sending failed:', error.message);
    throw error;
  }
}

export async function sendDocumentResubmittedEmail({ to, documentTitle, senderName, versionNumber, notes, documentId }) {
  try {
    const transport = getTransporter();
    const docUrl = `${env.clientUrl}/documents/${documentId}`;
    let content = `
      <p>Hello,</p>
      <p>This is an automated notification from the Document Tracking System.</p>
      <p><strong>${senderName}</strong> has uploaded a new version <strong>(V${versionNumber})</strong> for the document: <strong>"${documentTitle}"</strong>.</p>
      <div style="background-color: #f8fafc; padding: 20px; border-left: 4px solid #10b981; margin: 25px 0; border-radius: 4px;">
        <h3 style="margin-top: 0; color: #0f172a; font-size: 16px;">Change Summary / Notes:</h3>
        <p style="margin-bottom: 0;">${notes || 'No change notes provided.'}</p>
      </div>
      <div style="margin: 25px 0;">
        <a href="${docUrl}" class="button" style="background-color: #0f172a;">Review New Version</a>
      </div>
      <p style="font-size: 11px; color: #64748b; margin-top: 20px;">Or securely copy and paste this URL: ${docUrl}</p>
    `;

    const info = await transport.sendMail({
      from: `Registry Alerts <${env.smtp.from}>`,
      to,
      subject: `Document Updated (V${versionNumber}): ${documentTitle}`,
      text: `Hello,\n\n${senderName} has uploaded a new version (V${versionNumber}) for the document "${documentTitle}".\n\nNotes: ${notes}\n\nAccess it here: ${docUrl}`,
      html: baseTemplate(content),
      headers: {
        'X-Entity-Ref-Type': 'Document-Resubmit-Alert',
        'X-Priority': '3 (Normal)'
      }
    });

    if (env.nodeEnv !== 'production' && info.message) {
      console.log('Document resubmitted email preview (json transport):', info.message.toString());
    }

    return info;
  } catch (error) {
    console.error('Resubmitted document email sending failed:', error.message);
    throw error;
  }
}

export async function sendDocumentReviewDispatchedEmail({ to, documentTitle, senderName, notes, documentId }) {
  try {
    const transport = getTransporter();
    const docUrl = `${env.clientUrl}/documents/${documentId}`;
    let content = `
      <p>Hello,</p>
      <p>This is an automated notification from the Document Tracking System.</p>
      <p><strong>${senderName}</strong> has completed a review and marked their assessments on the document: <strong>"${documentTitle}"</strong>.</p>
      <div style="background-color: #f8fafc; padding: 20px; border-left: 4px solid #10b981; margin: 25px 0; border-radius: 4px;">
        <h3 style="margin-top: 0; color: #0f172a; font-size: 16px;">Review Summary / Notes:</h3>
        <p style="margin-bottom: 0;">${notes || 'Review completed without additional notes.'}</p>
      </div>
      <div style="margin: 25px 0;">
        <a href="${docUrl}" class="button" style="background-color: #0f172a;">Access Document Workspace</a>
      </div>
      <p style="font-size: 11px; color: #64748b; margin-top: 20px;">Or securely copy and paste this URL: ${docUrl}</p>
    `;

    const info = await transport.sendMail({
      from: `Registry Alerts <${env.smtp.from}>`,
      to,
      subject: `Review Completed: ${documentTitle}`,
      text: `Hello,\n\n${senderName} has completed their review of "${documentTitle}".\n\nNotes: ${notes}\n\nAccess it here: ${docUrl}`,
      html: baseTemplate(content),
      headers: {
        'X-Entity-Ref-Type': 'Document-Review-Alert',
        'X-Priority': '3 (Normal)'
      }
    });

    if (env.nodeEnv !== 'production' && info.message) {
      console.log('Document review dispatched email preview:', info.message.toString());
    }

    return info;
  } catch (error) {
    console.error('Review dispatched email sending failed:', error.message);
    throw error;
  }
}
export async function sendDocumentForwardedEmail({ to, documentTitle, forwardedByName, recipientNames, documentId }) {
  try {
    const transport = getTransporter();
    const docUrl = `${env.clientUrl}/documents/${documentId}`;
    let content = `
      <p>Hello,</p>
      <p>This is an automated notification from the Document Tracking System regarding your submitted document: <strong>"${documentTitle}"</strong>.</p>
      <p><strong>${forwardedByName}</strong> has forwarded this document to new reviewers/managers for further assessment:</p>
      <div style="background-color: #f8fafc; padding: 20px; border-left: 4px solid #3b82f6; margin: 25px 0; border-radius: 4px;">
        <p style="margin: 0; color: #1e293b; font-weight: 700;">Forwarded To:</p>
        <p style="margin: 5px 0 0; color: #475569;">${recipientNames}</p>
      </div>
      <p>You can track the real-time progress and see all review assessments in the document workspace.</p>
      <div style="margin: 25px 0;">
        <a href="${docUrl}" class="button" style="background-color: #0f172a;">Track Document Progress</a>
      </div>
      <p style="font-size: 11px; color: #64748b; margin-top: 20px;">Or securely copy and paste this URL: ${docUrl}</p>
    `;

    const info = await transport.sendMail({
      from: `Registry Alerts <${env.smtp.from}>`,
      to,
      subject: `Document Forwarded: ${documentTitle}`,
      text: `Hello,\n\nYour document "${documentTitle}" has been forwarded by ${forwardedByName} to: ${recipientNames}.\n\nTrack progress here: ${docUrl}`,
      html: baseTemplate(content),
      headers: {
        'X-Entity-Ref-Type': 'Document-Forwarded-Alert',
        'X-Priority': '3 (Normal)'
      }
    });

    if (env.nodeEnv !== 'production' && info.message) {
      console.log('Document forwarded email preview:', info.message.toString());
    }

    return info;
  } catch (error) {
    console.error('Forwarded document email sending failed:', error.message);
    throw error;
  }
}
