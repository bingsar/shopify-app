import {createClient} from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const getShopAuthToken = async (shop: string) => {
    const { data, error } = await supabase
        .from('stores')
        .select('access_token')
        .eq('shop_domain', shop)
        .single();

    if (error || !data?.access_token) {
        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Access token not found for shop' }),
        };
    }

    return data.access_token
}
