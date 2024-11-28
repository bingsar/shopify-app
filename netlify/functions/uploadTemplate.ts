import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import {getTrillionTryonContent} from "./templates/trillion-tryon";

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

        const API_BASE = `https://${shop}/admin/api/2023-01`;

        const themesResponse = await fetch(`${API_BASE}/themes.json`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN || '',
            },
        });

        const themesData = await themesResponse.json();
        const activeTheme = themesData.themes.find((theme: any) => theme.role === 'main');
        if (!activeTheme) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'No active theme found.' }),
            };
        }

        const themeId = activeTheme.id;

        const templateContent = getTrillionTryonContent(apiKey)

        const uploadTemplateResponse = await fetch(
            `${API_BASE}/themes/${themeId}/assets.json`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN || '',
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

        // Save the API key to Supabase
        const { error } = await supabase
            .from('stores')
            .update({ trillion_api_key: apiKey })
            .eq('shop_domain', shop);

        if (error) {
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
