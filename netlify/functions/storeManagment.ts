import { Handler } from '@netlify/functions';
import {supabase} from "../../supabase";

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
