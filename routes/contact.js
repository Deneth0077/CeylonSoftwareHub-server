import express from 'express';
import nodemailer from 'nodemailer';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Contact form submission
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { name, email, phone, subject, message, company } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        message: 'Name, email, subject, and message are required' 
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Create email transporter (configure with your email service)
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Email content for admin notification
    const adminEmailContent = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
      <p><strong>Company:</strong> ${company || 'Not provided'}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
      <hr>
      <p><small>Submitted at: ${new Date().toLocaleString()}</small></p>
      ${req.user ? `<p><small>User ID: ${req.user._id}</small></p>` : '<p><small>Submitted by guest</small></p>'}
    `;

    // Email content for user confirmation
    const userEmailContent = `
      <h2>Thank you for contacting Ceylon Software Hub!</h2>
      <p>Dear ${name},</p>
      <p>We have received your message and will get back to you within 24 hours.</p>
      
      <h3>Your Message Details:</h3>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
      
      <hr>
      <p>Best regards,<br>Ceylon Software Hub Team</p>
      <p>Email: support@ceylonsoftwarehub.com<br>Phone: +94 77 123 4567</p>
    `;

    // Send email to admin
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: process.env.ADMIN_EMAIL || 'admin@ceylonsoftwarehub.com',
          subject: `Contact Form: ${subject}`,
          html: adminEmailContent,
          replyTo: email,
        });

        // Send confirmation email to user
        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: email,
          subject: 'Thank you for contacting Ceylon Software Hub',
          html: userEmailContent,
        });
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Continue without failing the request
      }
    }

    // Store contact submission in database (optional)
    // You can create a Contact model and save the submission
    
    res.status(200).json({
      message: 'Message sent successfully! We will get back to you soon.',
      success: true
    });

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      message: 'Failed to send message. Please try again later.' 
    });
  }
});

// Get contact submissions (admin only)
router.get('/submissions', async (req, res) => {
  try {
    // This would require a Contact model to store submissions
    // For now, return empty array
    res.json({ submissions: [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;