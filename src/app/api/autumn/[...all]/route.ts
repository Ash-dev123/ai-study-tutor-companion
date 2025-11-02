import { autumnHandler } from "autumn-js/next";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const { GET, POST } = autumnHandler({
  identify: async (request) => {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return null;
    }
    
    return {
      customerId: session.user.id,
      customerData: {
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        email: session.user.email,
      },
    };
  },
});