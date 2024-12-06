import {Handler} from "@netlify/functions/dist/main";
import {createClient} from "@supabase/supabase-js";
import {getFileId, updateFile} from "./helpers/updateFile";
import {productModel} from "./templates/product-model";

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const handler: Handler = async (event) => {
    try {
        const { shop } = JSON.parse(event.body || '{}');
        console.log('Request received:', { shop });
        if (!shop) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing shop or API key' }),
            };
        }

        const { data, error } = await supabase
            .from('stores')
            .select('access_token')
            .eq('shop_domain', shop)
            .single();

        if (error || !data?.access_token) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Access token not found for shop' }),
            };
        }

        const SHOPIFY_ACCESS_TOKEN = data.access_token;
        console.log('got access token', SHOPIFY_ACCESS_TOKEN)
        const fileId = await getFileId(shop, SHOPIFY_ACCESS_TOKEN);
        if (!fileId) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'File product-model.js not found' }),
            };
        }

        await updateFile(shop, SHOPIFY_ACCESS_TOKEN, fileId, productModel);

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true }),
        };
    } catch (e) {
        console.error('Failed handle function upload file:', e);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
