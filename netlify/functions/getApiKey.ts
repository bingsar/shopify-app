import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const handler: Handler = async (event) => {
    try {
        const { data, error } = await supabase
            .from('stores')
            .select('trillion_api_key')
            .limit(1)
            .single();

        if (error || !data) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Trillion Api Key not found' }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ trillion_api_key: data.trillion_api_key }),
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
    }
};
