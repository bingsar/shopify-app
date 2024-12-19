import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import crypto from 'crypto';
import {supabase} from "../../supabase";

const REACT_APP_API_KEY = process.env.REACT_APP_SHOPIFY_API_KEY || '';
const REACT_APP_API_SECRET = process.env.REACT_APP_SHOPIFY_API_SECRET || '';
const REACT_APP_SHOPIFY_APP_NAME = process.env.REACT_APP_SHOPIFY_APP_NAME || '';

const validateHmac = (params: Record<string, string>, hmac: string): boolean => {
    const { hmac: _, ...rest } = params;
    const message = Object.keys(rest)
        .sort()
        .map((key) => `${key}=${rest[key]}`)
        .join('&');

    const generatedHmac = crypto
        .createHmac('sha256', REACT_APP_API_SECRET)
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
                client_id: REACT_APP_API_KEY,
                client_secret: REACT_APP_API_SECRET,
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
            const shopName = shop.replace('.myshopify.com', '');
            return {
                statusCode: 302,
                headers: {
                    Location: `https://admin.shopify.com/store/${shopName}/apps/${REACT_APP_SHOPIFY_APP_NAME}`,
                },
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
