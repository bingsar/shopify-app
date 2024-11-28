import { Handler } from '@netlify/functions';
import { shopifyApi } from '@shopify/shopify-api';
import { createClient } from '@supabase/supabase-js';
import { getTrillionTryonContent } from './templates/trillion-tryon';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SHOPIFY_API_VERSION = '2024-10'; // Update based on your app's versioning

export const handler: Handler = async (event) => {
    try {
        const { shop, apiKey } = JSON.parse(event.body || '{}');
        console.log('Request received:', { shop, apiKey });

        if (!shop || !apiKey) {
            console.error('Missing shop or API key');
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing shop or API key' }),
            };
        }

        // Fetch the access token from Supabase
        const { data, error } = await supabase
            .from('stores')
            .select('access_token')
            .eq('shop_domain', shop)
            .single();

        if (error || !data?.access_token) {
            console.error('Error fetching access token:', error || 'No access token found');
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Access token not found for shop' }),
            };
        }

        const SHOPIFY_ACCESS_TOKEN = data.access_token;

        // Fetch the active theme ID dynamically
        console.log('Fetching themes for shop:', shop);
        const themesResponse = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/themes.json`, {
            method: 'GET',
            headers: {
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                'Content-Type': 'application/json',
            },
        });

        if (!themesResponse.ok) {
            const errorData = await themesResponse.json();
            console.error('Error fetching themes:', errorData);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: errorData.errors || 'Failed to fetch themes' }),
            };
        }

        const themesData = await themesResponse.json();
        const activeTheme = themesData.themes.find((theme: any) => theme.role === 'main');

        if (!activeTheme) {
            console.error('Active theme not found');
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Active theme not found' }),
            };
        }

        const themeId = activeTheme.id;
        console.log('Active theme ID:', themeId);

        // Initialize the Shopify REST API client
        const shopify = shopifyApi({
            apiKey: process.env.SHOPIFY_API_KEY || '',
            apiSecretKey: process.env.SHOPIFY_API_SECRET || '',
            apiVersion: SHOPIFY_API_VERSION,
        });

        const session = {
            shop,
            accessToken: SHOPIFY_ACCESS_TOKEN,
        };

        // Generate template content
        const templateContent = getTrillionTryonContent(apiKey);

        // Upload the template
        const asset = new shopify.rest.Asset({session: session});
        asset.theme_id = themeId; // Use the dynamically fetched theme ID
        asset.key = 'templates/page.trillion-tryon.liquid';
        asset.value = templateContent;

        console.log('Uploading template to Shopify...');
        await asset.save({
            update: true, // Ensures the asset is created or updated
        });

        console.log('Template uploaded successfully.');

        // Save the API key to Supabase
        const { error: saveError } = await supabase
            .from('stores')
            .update({ trillion_api_key: apiKey })
            .eq('shop_domain', shop);

        if (saveError) {
            console.error('Error saving API key to database:', saveError);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to save API key to database' }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true }),
        };
    } catch (error) {
        console.error('Unexpected error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
