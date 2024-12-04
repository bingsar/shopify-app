import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const handler: Handler = async (event) => {
    const { apiKeyId, newApiKey } = JSON.parse(event.body || '{}');

    // Check if necessary data is provided
    if (!apiKeyId || !newApiKey) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required parameters" }),
        };
    }

    // Update the API key in Supabase
    const { data, error } = await supabase
        .from('api_keys')
        .update({ api_key: newApiKey })
        .eq('id', apiKeyId)
        .select();

    if (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error updating API key", error }),
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: "API key updated successfully", data }),
    };
};

export { handler };