import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !phoneNumber) {
  throw new Error('Twilio credentials are missing from environment variables');
}

const client = twilio(accountSid, authToken);

export const sendOTP = async (to: string, otp: string) => {
  try {
    const message = await client.messages.create({
      body: `Your ${process.env.NEXT_PUBLIC_SITE_NAME || 'Muscari Mart'} verification code is: ${otp}. This code will expire in 10 minutes.`,
      from: phoneNumber,
      to: to,
    });
    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('Twilio SMS Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
};

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};