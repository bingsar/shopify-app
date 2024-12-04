import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const handler: Handler = async (event, context) => {
    const shopDomain = event.queryStringParameters.shop;

    const { data, error } = await supabase
        .from('stores')
        .select('trillion_api_key')
        .eq('shop_domain', shopDomain)
        .single();

    if (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ trillion_api_key: data.trillion_api_key }),
    };
};

export { handler };