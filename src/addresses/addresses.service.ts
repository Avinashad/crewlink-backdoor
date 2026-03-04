import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../config/supabase.config';

export interface Address {
  id: string;
  userId: string;
  type: 'home' | 'work' | 'billing' | 'shipping';
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  formattedAddress?: string | null;
  placeId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  approximateLatitude?: number | null;
  approximateLongitude?: number | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressDto {
  type?: 'home' | 'work' | 'billing' | 'shipping';
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryCode?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  approximateLatitude?: number;
  approximateLongitude?: number;
  isPrimary?: boolean;
}

export type UpdateAddressDto = Partial<CreateAddressDto>;

@Injectable()
export class AddressesService {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  /**
   * Get user's primary address (usually 'home')
   */
  async getPrimaryAddress(userId: string): Promise<Address | null> {
    const { data, error } = await this.supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .eq('type', 'home')
      .single();

    if (error && (error as any).code !== 'PGRST116') {
      throw new BadRequestException('Failed to fetch address');
    }

    if (!data) {
      return null;
    }

    return this.mapToAddress(data);
  }

  /**
   * Get all user addresses
   */
  async getUserAddresses(userId: string): Promise<Address[]> {
    const { data, error } = await this.supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException('Failed to fetch addresses');
    }

    return (data || []).map((row) => this.mapToAddress(row));
  }

  /**
   * Create or update user's primary address
   */
  async upsertPrimaryAddress(
    userId: string,
    dto: CreateAddressDto,
  ): Promise<Address> {
    // Check if user has a primary home address
    const existing = await this.getPrimaryAddress(userId);

    if (existing) {
      // Update existing
      return this.updateAddress(userId, existing.id, dto);
    }

    // Create new
    const { data, error} = await this.supabase
      .from('addresses')
      .insert({
        user_id: userId,
        type: dto.type || 'home',
        address_line1: dto.addressLine1 || null,
        address_line2: dto.addressLine2 || null,
        city: dto.city || null,
        state: dto.state || null,
        postal_code: dto.postalCode || null,
        country_code: dto.countryCode || null,
        place_id: dto.placeId || null,
        latitude: dto.latitude || null,
        longitude: dto.longitude || null,
        approximate_latitude: dto.approximateLatitude || null,
        approximate_longitude: dto.approximateLongitude || null,
        is_primary: true,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException('Failed to create address');
    }

    return this.mapToAddress(data);
  }

  /**
   * Update an address
   */
  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<Address> {
    const updateData: Record<string, any> = {};

    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.addressLine1 !== undefined) updateData.address_line1 = dto.addressLine1;
    if (dto.addressLine2 !== undefined) updateData.address_line2 = dto.addressLine2;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.state !== undefined) updateData.state = dto.state;
    if (dto.postalCode !== undefined) updateData.postal_code = dto.postalCode;
    if (dto.countryCode !== undefined) updateData.country_code = dto.countryCode;
    if (dto.placeId !== undefined) updateData.place_id = dto.placeId;
    if (dto.latitude !== undefined) updateData.latitude = dto.latitude;
    if (dto.longitude !== undefined) updateData.longitude = dto.longitude;
    if (dto.approximateLatitude !== undefined) updateData.approximate_latitude = dto.approximateLatitude;
    if (dto.approximateLongitude !== undefined) updateData.approximate_longitude = dto.approximateLongitude;
    if (dto.isPrimary !== undefined) updateData.is_primary = dto.isPrimary;

    const { data, error } = await this.supabase
      .from('addresses')
      .update(updateData)
      .eq('id', addressId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException('Failed to update address');
    }

    return this.mapToAddress(data);
  }

  /**
   * Delete an address
   */
  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const { error } = await this.supabase
      .from('addresses')
      .delete()
      .eq('id', addressId)
      .eq('user_id', userId);

    if (error) {
      throw new BadRequestException('Failed to delete address');
    }
  }

  private mapToAddress(data: any): Address {
    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      addressLine1: data.address_line1,
      addressLine2: data.address_line2,
      city: data.city,
      state: data.state,
      postalCode: data.postal_code,
      countryCode: data.country_code,
      formattedAddress: data.formatted_address,
      placeId: data.place_id,
      latitude: data.latitude,
      longitude: data.longitude,
      approximateLatitude: data.approximate_latitude,
      approximateLongitude: data.approximate_longitude,
      isPrimary: data.is_primary,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
