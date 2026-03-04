import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GeoIpService {
  private readonly logger = new Logger(GeoIpService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Returns true when the IP is clearly not a public client IP
   * (loopback, private RFC1918 ranges, link-local, localhost, etc.).
   */
  private isPrivateOrLocalIp(ip: string): boolean {
    const value = ip.toLowerCase();

    if (!value) return true;

    // IPv6 localhost / unspecified
    if (value === '::1' || value === '::' || value === '0:0:0:0:0:0:0:1') {
      return true;
    }

    // IPv4 localhost
    if (value === '127.0.0.1') {
      return true;
    }

    // Strip IPv6-mapped IPv4 prefix if present (e.g., ::ffff:192.168.0.1)
    const withoutV6Prefix = value.startsWith('::ffff:') ? value.replace('::ffff:', '') : value;

    // Now check IPv4-style private ranges
    if (withoutV6Prefix.startsWith('10.')) return true;
    if (withoutV6Prefix.startsWith('192.168.')) return true;

    // 172.16.0.0 – 172.31.255.255
    if (withoutV6Prefix.startsWith('172.')) {
      const parts = withoutV6Prefix.split('.');
      const second = Number(parts[1]);
      if (second >= 16 && second <= 31) return true;
    }

    // Link-local 169.254.0.0/16
    if (withoutV6Prefix.startsWith('169.254.')) return true;

    return false;
  }

  /**
   * Detect ISO 3166-1 alpha-2 country code from an IP address using a GeoIP service.
   *
   * Returns `null` when detection fails or when the IP is invalid/private.
   */
  async detectCountryCode(ip?: string | null): Promise<string | null> {
    if (!ip) {
      return null;
    }

    const rawIp = Array.isArray(ip) ? ip[0] : ip;
    const sanitizedIp = rawIp.split(',')[0].trim();

    // If we clearly don't have a real public client IP, bail early and keep existing defaults.
    if (!sanitizedIp || this.isPrivateOrLocalIp(sanitizedIp)) {
      return null;
    }

    const provider = this.configService.get<string>('geoip.provider') || 'ip-api';
    const baseUrl = this.configService.get<string>('geoip.baseUrl');
    const apiKey = this.configService.get<string>('geoip.apiKey');

    try {
      if (provider === 'ip-api' || !baseUrl) {
        // ip-api.com specific handling
        const url = `http://ip-api.com/json/${encodeURIComponent(
          sanitizedIp,
        )}?fields=status,countryCode,message`;

        const globalFetch = (globalThis as any).fetch as
          | ((input: any, init?: any) => Promise<any>)
          | undefined;

        if (!globalFetch) {
          this.logger.warn('Global fetch is not available; skipping GeoIP lookup');
          return null;
        }

        const res = await globalFetch(url);
        if (!res.ok) {
          return null;
        }

        const data: any = await res.json();
        if (data && data.status === 'success' && typeof data.countryCode === 'string') {
          return data.countryCode.toUpperCase();
        }

        return null;
      }

      // Generic JSON GeoIP provider
      const trimmedBase = baseUrl.replace(/\/$/, '');
      const url = `${trimmedBase}/${encodeURIComponent(sanitizedIp)}`;

      const headers: Record<string, string> = {};
      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }

      const globalFetch = (globalThis as any).fetch as
        | ((input: any, init?: any) => Promise<any>)
        | undefined;

      if (!globalFetch) {
        this.logger.warn('Global fetch is not available; skipping GeoIP lookup');
        return null;
      }

      const res = await globalFetch(url, { headers });
      if (!res.ok) {
        return null;
      }

      const data: any = await res.json();
      const code: unknown = data?.countryCode ?? data?.country_code ?? data?.country;

      if (typeof code === 'string' && code.length === 2) {
        return code.toUpperCase();
      }

      return null;
    } catch (error) {
      this.logger.warn(
        `GeoIP lookup failed for IP ${sanitizedIp}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }
}

