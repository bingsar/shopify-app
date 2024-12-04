import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const handler: Handler = async (event) => {
    const { shop_domain } = JSON.parse(event.body);

    const { data, error } = await supabase
        .from('stores')
        .update({ trillion_api_key: null })
        .eq('shop_domain', shop_domain);

    if (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to delete API key' }),
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'API key deleted successfully' }),
    };
}