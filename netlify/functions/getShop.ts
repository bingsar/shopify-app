import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const REACT_APP_SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';
const REACT_APP_SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || '';
const supabase = createClient(REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_KEY);

export const handler: Handler = async (event) => {
    try {
        const { data, error } = await supabase
            .from('stores')
            .select('shop_domain')
            .limit(1)
            .single();

        if (error || !data) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Shop not found' }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ shop: data.shop_domain }),
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
    }
};
