# EmailJS Integration Guide for AnalytixFlow

This guide explains how to set up and use EmailJS in your application.

## Setup Instructions

1. **Create an EmailJS Account**
   - Go to [EmailJS](https://www.emailjs.com/) and create an account
   - Verify your email address

2. **Create an Email Service**
   - In the EmailJS dashboard, go to "Email Services"
   - Click "Add New Service"
   - Choose your email provider (Gmail, Outlook, etc.)
   - Follow the instructions to connect your email account

3. **Create Email Templates**
   - Go to "Email Templates"
   - Click "Create New Template"
   - Design your email template using the visual editor
   - Use variables like `{{from_name}}`, `{{reply_to}}`, and `{{message}}` in your template
   - Save your template

4. **Get Your API Keys**
   - Go to "Integration" in the dashboard
   - Copy your "User ID" (this is your public key)
   - Note your Service ID and Template ID

5. **Update the Code**
   - Open `src/lib/emailjs.ts`
   - Replace `YOUR_PUBLIC_KEY` with your EmailJS User ID
   - Replace `YOUR_SERVICE_ID` with your Service ID
   - Replace `YOUR_TEMPLATE_ID` with your Template ID

## Usage Examples

### Basic Contact Form

```tsx
import { sendContactEmail } from '../lib/emailjs';

// In your form submit handler:
try {
  await sendContactEmail(name, email, message);
  // Show success message
} catch (error) {
  // Handle error
}
```

### Upgrade Request

```tsx
import { sendUpgradeRequest } from '../lib/emailjs';

// In your form submit handler:
try {
  await sendUpgradeRequest({
    name: userData.name,
    email: userData.email,
    phone: userData.phone,
    company: userData.company,
    userId: userData.userId,
    plan: 'premium',
    message: userData.message
  });
  // Show success message
} catch (error) {
  // Handle error
}
```

## EmailJS Template Variables

### Contact Form Template
- `{{from_name}}` - Sender's name
- `{{reply_to}}` - Sender's email
- `{{message}}` - Message content

### Upgrade Request Template
- `{{user_name}}` - User's name
- `{{user_email}}` - User's email
- `{{user_phone}}` - User's phone
- `{{user_company}}` - User's company
- `{{user_id}}` - User's ID in your system
- `{{plan_requested}}` - Requested plan
- `{{request_date}}` - Date of request
- `{{message}}` - Additional message