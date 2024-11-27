import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.SHOPIFY_API_KEY || '';
const API_SECRET = process.env.SHOPIFY_API_SECRET || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const handler: Handler = async (event) => {
    const { queryStringParameters } = event;
    const { shop, code, hmac } = queryStringParameters || {};

    if (!shop || !code || !hmac) {
        return {
            statusCode: 400,
            body: 'Missing required parameters',
        };
    }

    const accessTokenUrl = `https://${shop}/admin/oauth/access_token`;

    try {
        const response = await fetch(accessTokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id: API_KEY,
                client_secret: API_SECRET,
                code,
            }),
        });

        const data = await response.json();

        if (response.ok) {
            // Save access token and shop in Supabase
            const { error } = await supabase
                .from('stores')
                .upsert(
                    {
                        shop_domain: shop,
                        access_token: data.access_token,
                        installed_at: new Date().toISOString(),
                    },
                    { onConflict: 'shop_domain' } // Ensures shop_domain is unique
                );

            if (error) {
                console.error('Supabase error:', error);
                return {
                    statusCode: 500,
                    body: `Failed to save shop in database: ${error.message}`,
                };
            }

            return {
                statusCode: 200,
                body: 'App installed successfully!',
            };
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify(data),
            };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: 'An unexpected error occurred',
        };
    }
};
