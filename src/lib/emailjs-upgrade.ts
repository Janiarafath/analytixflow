import emailjs from '@emailjs/browser';

/**
 * Send an upgrade request email with payment proof
 * @param userData User data for the upgrade request
 * @param paymentProofFile File object containing payment proof
 * @returns Promise with the result of the email sending
 */
export const sendUpgradeRequestWithProof = async (
  userData: {
    name: string;
    email: string;
    phone: string;
    company?: string;
    userId: string;
    message?: string;
  },
  paymentProofFile: File
): Promise<emailjs.EmailJSResponseStatus> => {
  // Convert file to base64 for EmailJS
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(paymentProofFile);
    
    reader.onload = async () => {
      const base64File = reader.result as string;
      
      try {
        // Prepare template parameters
        const templateParams = {
          to_name: "Admin", // The recipient name (usually your admin)
          from_name: userData.name,
          user_email: userData.email,
          user_phone: userData.phone,
          user_company: userData.company || "Not provided",
          user_id: userData.userId,
          message: userData.message || "No additional message",
          request_date: new Date().toLocaleDateString(),
          payment_proof_name: paymentProofFile.name,
          payment_proof_data: base64File
        };
        
        // Send email using EmailJS
        const response = await emailjs.send(
          'service_57l8418', // Your EmailJS service ID
          'template_gsyinza', // Your EmailJS template ID
          templateParams,
          '3o11xY4ewKf_Q9ccm' // Your EmailJS public key
        );
        
        resolve(response);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
  });
};