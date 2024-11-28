import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import { getTrillionTryonContent } from './templates/trillion-tryon';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const handler: Handler = async (event) => {
    try {
        const { shop, apiKey } = JSON.parse(event.body || '{}');
        if (!shop || !apiKey) {
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
            console.error('Error fetching access token:', error);
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Access token not found for shop' }),
            };
        }

        const SHOPIFY_ACCESS_TOKEN = data.access_token;

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
        console.log('Themes Data:', themesData);

        if (!themesData || !Array.isArray(themesData.themes)) {
            throw new Error('Invalid themes data: themes array is missing.');
        }

        const activeTheme = themesData.themes.find((theme: any) => theme.role === 'main');
        if (!activeTheme) {
            throw new Error('Active theme not found.');
        }

        const themeId = activeTheme.id;
        console.log('Active Theme ID:', themeId);

        const templateContent = getTrillionTryonContent(apiKey);

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
            return {
                statusCode: 400,
                body: JSON.stringify({ error: error.errors }),
            };
        }

        const { error: saveError } = await supabase
            .from('stores')
            .update({ trillion_api_key: apiKey })
            .eq('shop_domain', shop);

        if (saveError) {
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
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
