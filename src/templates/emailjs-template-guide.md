# EmailJS Template Guide for Upgrade Requests

This guide explains how to set up the upgrade request template in EmailJS.

## Template Setup in EmailJS Dashboard

1. **Log in to your EmailJS account**
2. **Go to "Email Templates"**
3. **Click "Create New Template"**
4. **Choose a name** (e.g., "Premium Upgrade Request")
5. **Set the subject** (e.g., "New Premium Upgrade Request from {{from_name}}")

## HTML Template

Copy and paste the HTML below into the EmailJS template editor:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Premium Upgrade Request</title>
  <style type="text/css">
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #4f46e5;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background-color: #f9fafb;
      padding: 20px;
      border-radius: 0 0 8px 8px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .message-box {
      background-color: white;
      padding: 20px;
      border-radius: 8px;
      margin-top: 20px;
      border: 1px solid #e5e7eb;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: #6b7280;
    }
    .field {
      margin-bottom: 10px;
    }
    .field-label {
      font-weight: bold;
    }
    h1 {
      margin: 0;
      font-size: 24px;
    }
    h2 {
      color: #4f46e5;
      margin-top: 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Premium Upgrade Request</h1>
    </div>
    <div class="content">
      <h2>Hello {{to_name}},</h2>
      
      <p>You have received a new premium upgrade request from {{from_name}}.</p>
      
      <div class="message-box">
        <div class="field">
          <span class="field-label">User Name:</span> {{from_name}}
        </div>
        <div class="field">
          <span class="field-label">Email:</span> {{user_email}}
        </div>
        <div class="field">
          <span class="field-label">Phone:</span> {{user_phone}}
        </div>
        <div class="field">
          <span class="field-label">Company:</span> {{user_company}}
        </div>
        <div class="field">
          <span class="field-label">User ID:</span> {{user_id}}
        </div>
        <div class="field">
          <span class="field-label">Request Date:</span> {{request_date}}
        </div>
        <div class="field">
          <span class="field-label">Message:</span>
          <p>{{message}}</p>
        </div>
        
        <div class="field">
          <span class="field-label">Payment Proof:</span>
          <p>{{payment_proof_name}}</p>
        </div>
      </div>
      
      <div class="footer">
        <p>This is an automated email from the AnalytixFlow upgrade system.</p>
      </div>
    </div>
  </div>
</body>
</html>
```

## Template Variables

The template uses the following variables that will be replaced with actual values when the email is sent:

| Variable | Description |
|----------|-------------|
| `{{to_name}}` | Recipient's name (usually "Admin") |
| `{{from_name}}` | User's full name |
| `{{user_email}}` | User's email address |
| `{{user_phone}}` | User's phone number |
| `{{user_company}}` | User's company name |
| `{{user_id}}` | User's ID in your system |
| `{{request_date}}` | Date when the request was submitted |
| `{{message}}` | Additional message from the user |
| `{{payment_proof_name}}` | Name of the payment proof file |
| `{{payment_proof_data}}` | Base64-encoded payment proof file (automatically attached) |

## Important Notes

1. EmailJS will automatically handle the file attachment when you pass the base64-encoded file data.
2. The maximum file size for attachments is 5MB.
3. Make sure to test your template by sending a test email through the EmailJS dashboard.
4. You can customize the colors and styling to match your brand.