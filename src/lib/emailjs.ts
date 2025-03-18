import emailjs from '@emailjs/browser';

// Initialize EmailJS with your public key
// This should be called once in your application, typically in your main component or during initialization
export const initEmailJS = () => {
  emailjs.init("3o11xY4ewKf_Q9ccm"); // Your EmailJS public key
};

interface EmailParams {
  to_name?: string;
  from_name?: string;
  reply_to?: string;
  message?: string;
  [key: string]: any; // Allow any additional parameters
}

/**
 * Send an email using EmailJS
 * @param serviceId Your EmailJS service ID
 * @param templateId Your EmailJS template ID
 * @param params Parameters to pass to the template
 * @returns Promise with the result of the email sending
 */
export const sendEmail = async (
  serviceId: string,
  templateId: string,
  params: EmailParams
): Promise<emailjs.EmailJSResponseStatus> => {
  try {
    const result = await emailjs.send(serviceId, templateId, params);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send a contact form email
 * @param name Sender's name
 * @param email Sender's email
 * @param message Message content
 * @returns Promise with the result of the email sending
 */
export const sendContactEmail = async (
  name: string,
  email: string,
  message: string
): Promise<emailjs.EmailJSResponseStatus> => {
  return sendEmail(
    "service_57l8418", // Your EmailJS service ID
    "template_gsyinza", // Your EmailJS template ID
    {
      from_name: name,
      reply_to: email,
      message: message,
    }
  );
};

/**
 * Send an upgrade request email
 * @param userData User data for the upgrade request
 * @returns Promise with the result of the email sending
 */
export const sendUpgradeRequest = async (
  userData: {
    name: string;
    email: string;
    phone: string;
    company?: string;
    userId: string;
    plan: string;
    message?: string;
  }
): Promise<emailjs.EmailJSResponseStatus> => {
  return sendEmail(
    "service_57l8418", // Your EmailJS service ID
    "template_gsyinza", // Your EmailJS template ID
    {
      user_name: userData.name,
      user_email: userData.email,
      user_phone: userData.phone,
      user_company: userData.company || "Not provided",
      user_id: userData.userId,
      plan_requested: userData.plan,
      message: userData.message || "No additional message",
      request_date: new Date().toISOString(),
    }
  );
};