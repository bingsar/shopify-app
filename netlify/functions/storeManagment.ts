import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing Supabase credentials in environment variables');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface StoreRequestBody {
    apiKey: string;
}

export const handler: Handler = async (event, context) => {
    try {
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Request body is missing' }),
            };
        }

        const body: StoreRequestBody = JSON.parse(event.body);

        if (!body.apiKey) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'API key is required' }),
            };
        }

        const { data, error } = await supabase
            .from('stores')
            .insert([{ api_key: body.apiKey }]);

        if (error) throw error;

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Store added successfully', data }),
        };
    } catch (err: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message }),
        };
    }
};
