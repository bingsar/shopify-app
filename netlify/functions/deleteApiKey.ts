import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const REACT_APP_SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';
const REACT_APP_SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || '';
const supabase = createClient(REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_KEY);

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