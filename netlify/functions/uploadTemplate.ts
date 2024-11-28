import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import { getTrillionTryonContent } from './templates/trillion-tryon';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const handler: Handler = async (event) => {
    try {
        // Parse incoming request
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
        console.log('Access token retrieved for shop:', shop);

        // Fetch themes from Shopify
        const API_BASE = `https://${shop}/admin/api/2023-01`;
        const themesResponse = await fetch(`${API_BASE}/themes.json`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
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
        console.log('Themes data received:', themesData);

        if (!themesData || !Array.isArray(themesData.themes)) {
            console.error('Invalid themes data:', themesData);
            throw new Error('Invalid themes data: themes array is missing.');
        }

        const activeTheme = themesData.themes.find((theme: any) => theme.role === 'main');
        if (!activeTheme) {
            console.error('Active theme not found in themes data');
            throw new Error('Active theme not found.');
        }

        const themeId = activeTheme.id;
        console.log('Active theme ID:', themeId);

        // Generate the template content
        const templateContent = getTrillionTryonContent(apiKey);
        console.log('Generated template content for API key.');

        // Upload the template to Shopify
        const uploadTemplateResponse = await fetch(
            `${API_BASE}/themes/${themeId}/assets.json`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                },
                body: JSON.stringify({
                    asset: {
                        key: 'templates/page.trillion-tryon.liquid',
                        value: templateContent,
                    },
                }),
            }
        );

        if (!uploadTemplateResponse.ok) {
            const error = await uploadTemplateResponse.json();
            console.error('Error uploading template:', error);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: error.errors || 'Failed to upload template' }),
            };
        }

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

        console.log('API key saved to database for shop:', shop);

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
