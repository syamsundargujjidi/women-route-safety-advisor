
/**
 * Service to handle SMS alerts via Fast2SMS API
 */

const FAST2SMS_API_KEY = 'K8b3PB04HIdTsrn5u9lkGRWYXcifMA1CpveUQ6aOwmtFx7EgNJ1lUjIpw7GnW4XMCAs0tkBydOSouR53';

export async function sendSOS_SMS(phoneNumber: string, lat?: number, lng?: number): Promise<boolean> {
  if (!phoneNumber) return false;

  // Clean phone number (ensure no + or spaces for Fast2SMS)
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // Construct a helpful message with a direct Google Maps link
  const locationLink = lat && lng ? `\nLocation: https://www.google.com/maps?q=${lat},${lng}` : '';
  const message = `EMERGENCY ALERT: Your contact has triggered a distress signal from the Safe Advisor App.${locationLink}`;

  try {
    // Fast2SMS Bulk V2 API Endpoint (Quick Message Route)
    const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${FAST2SMS_API_KEY}&route=q&message=${encodeURIComponent(message)}&language=english&flash=0&numbers=${cleanNumber}`;

    const response = await fetch(url, {
      method: 'GET',
    });

    const data = await response.json();
    
    if (data.return) {
      console.log("SMS sent successfully:", data.message);
      return true;
    } else {
      console.error("Fast2SMS Error:", data.message);
      return false;
    }
  } catch (error) {
    console.error("SMS Service Failed:", error);
    return false;
  }
}
