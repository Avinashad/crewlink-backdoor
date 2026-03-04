export default () => ({
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    expiration: process.env.JWT_EXPIRATION || '7d',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '30d',
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  frontend: {
    urls: (process.env.FRONTEND_URLS || 'http://localhost:3000')
      .split(',')
      .map((url: string) => url.trim())
      .filter((url: string) => url.length > 0),
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
  geoip: {
    /**
     * GeoIP provider identifier.
     * Currently only "ip-api" has special handling; any other value is treated as a generic JSON API.
     */
    provider: process.env.GEOIP_PROVIDER || 'ip-api',
    /**
     * Optional base URL for a custom GeoIP service.
     * If not provided and provider is "ip-api", the default ip-api.com endpoint is used.
     */
    baseUrl: process.env.GEOIP_BASE_URL,
    /**
     * Optional API key for GeoIP providers that require authentication.
     * This will be sent as a Bearer token in the Authorization header for generic providers.
     */
    apiKey: process.env.GEOIP_API_KEY,
    /**
     * Fallback country code to use when detection fails.
     * This does NOT override explicit values sent by clients.
     */
    defaultCountryCode: process.env.DEFAULT_COUNTRY_CODE || 'NZ',
  },
});
