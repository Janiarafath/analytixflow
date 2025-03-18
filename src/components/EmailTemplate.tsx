import React from 'react';

// This component is for demonstration purposes only
// It shows what your EmailJS template might look like
// You would create this template in the EmailJS dashboard, not in your React app

export const EmailTemplate: React.FC = () => {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ backgroundColor: '#4f46e5', color: 'white', padding: '20px', textAlign: 'center' }}>
        <h1>AnalytixFlow</h1>
      </div>
      
      <div style={{ padding: '20px', backgroundColor: '#f9fafb' }}>
        <h2>New Contact Message</h2>
        
        <div style={{ marginTop: '20px', backgroundColor: 'white', padding: '15px', borderRadius: '5px' }}>
          <p><strong>From:</strong> {{from_name}}</p>
          <p><strong>Email:</strong> {{reply_to}}</p>
          <p><strong>Message:</strong></p>
          <p>{{message}}</p>
        </div>
        
        <div style={{ marginTop: '30px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
          <p>This email was sent from the contact form on AnalytixFlow.</p>
        </div>
      </div>
    </div>
  );
};

export const UpgradeRequestTemplate: React.FC = () => {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ backgroundColor: '#4f46e5', color: 'white', padding: '20px', textAlign: 'center' }}>
        <h1>AnalytixFlow - Premium Upgrade Request</h1>
      </div>
      
      <div style={{ padding: '20px', backgroundColor: '#f9fafb' }}>
        <h2>New Upgrade Request</h2>
        
        <div style={{ marginTop: '20px', backgroundColor: 'white', padding: '15px', borderRadius: '5px' }}>
          <p><strong>User Name:</strong> {{user_name}}</p>
          <p><strong>Email:</strong> {{user_email}}</p>
          <p><strong>Phone:</strong> {{user_phone}}</p>
          <p><strong>Company:</strong> {{user_company}}</p>
          <p><strong>User ID:</strong> {{user_id}}</p>
          <p><strong>Plan Requested:</strong> {{plan_requested}}</p>
          <p><strong>Request Date:</strong> {{request_date}}</p>
          <p><strong>Additional Message:</strong></p>
          <p>{{message}}</p>
        </div>
        
        <div style={{ marginTop: '30px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
          <p>This is an automated email from the AnalytixFlow upgrade system.</p>
        </div>
      </div>
    </div>
  );
};