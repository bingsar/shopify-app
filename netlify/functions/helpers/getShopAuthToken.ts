import {createClient} from "@supabase/supabase-js";

const REACT_APP_SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';
const REACT_APP_SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || '';
const supabase = createClient(REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_KEY);

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
