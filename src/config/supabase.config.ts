import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

export const createSupabaseClient = (
  configService: ConfigService,
): SupabaseClient => {
  const supabaseUrl = configService.get<string>('supabase.url');
  const supabaseKey = configService.get<string>('supabase.serviceRoleKey');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL or Service Role Key is not configured');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';
