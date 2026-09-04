import "dotenv/config"

const config={
    MONGO_URI:process.env.MONGO_URI,
    JWT_SECRET:process.env.JWT_SECRET,
    GOOGLE_CLIENT_ID:process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET:process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN:process.env.GOOGLE_REFRESH_TOKEN,
    GOOGLE_USER:process.env.GOOGLE_USER,
    GOOGLE_GENAI_API_KEY:process.env.GOOGLE_GENAI_API_KEY,
   RESEND_API_KEY:process.env.RESEND_API_KEY,
EMAIL_VERIFICATION_API_KEY:process.env.EMAIL_VERIFICATION_API_KEY
}

export default config