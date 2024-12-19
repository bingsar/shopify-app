import { Handler } from '@netlify/functions';
import {supabase} from "../../supabase";

const handler: Handler = async (event) => {
    const { apiKeyId, newApiKey } = JSON.parse(event.body || '{}');

    if (!apiKeyId || !newApiKey) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Missing required parameters" }),
        };
    }

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