import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.SHOPIFY_API_KEY || '';
const API_SECRET = process.env.SHOPIFY_API_SECRET || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const validateHmac = (params: Record<string, string>, hmac: string): boolean => {
    const { hmac: _, ...rest } = params;
    const message = Object.keys(rest)
        .sort()
        .map((key) => `${key}=${rest[key]}`)
        .join('&');

    const generatedHmac = crypto
        .createHmac('sha256', API_SECRET)
        .update(message)
        .digest('hex');

    return generatedHmac === hmac;
};

export const handler: Handler = async (event) => {
    const { queryStringParameters } = event;
    const { shop, code, hmac } = queryStringParameters || {};

    if (!shop || !code || !hmac) {
        return {
            statusCode: 400,
            body: 'Missing required parameters',
        };
    }

    // Validate HMAC
    if (!validateHmac(queryStringParameters, hmac)) {
        return {
            statusCode: 403,
            body: 'HMAC validation failed',
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
            const { error } = await supabase
                .from('stores')
                .upsert(
                    {
                        shop_domain: shop,
                        access_token: data.access_token,
                        installed_at: new Date().toISOString(),
                    },
                    { onConflict: 'shop_domain' }
                );

            if (error) {
                console.error('Supabase error:', error);
                return {
                    statusCode: 500,
                    body: `Failed to save shop in database: ${error.message}`,
                };
            }

            console.log(`Successfully saved shop ${shop} in database.`);
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'App installed successfully!', shop }),
            };
        } else {
            console.error('Failed to exchange access token:', data);
            return {
                statusCode: 400,
                body: `Error exchanging access token: ${data.error_description || 'Unknown error'}`,
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
