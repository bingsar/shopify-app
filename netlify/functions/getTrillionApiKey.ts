import { Handler } from '@netlify/functions';
import {supabase} from "../../supabase";

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