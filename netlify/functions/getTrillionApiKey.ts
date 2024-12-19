import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const REACT_APP_SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';
const REACT_APP_SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || '';
const supabase = createClient(REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_KEY);

const handler: Handler = async (event, context) => {
    const shopDomain = event.queryStringParameters.shop;

    const { data, error } = await supabase
        .from('stores')
        .select('trillion_api_key')
        .eq('shop_domain', shopDomain)
        .single();

    if (error) {
        console.error('Error fetching Trillion API Key:', error);
        return null;
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ trillion_api_key: data.trillion_api_key }),
    };
};

export { handler };