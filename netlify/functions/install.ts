import { Handler } from '@netlify/functions';

const API_KEY = process.env.SHOPIFY_API_KEY;

export const handler: Handler = async (event) => {
    const { queryStringParameters } = event;
    const shop = queryStringParameters?.shop;

    if (!shop) {
        return {
            statusCode: 400,
            body: 'Shop query parameter is required',
        };
    }

    const redirectUrl = `https://${shop}/admin/oauth/authorize?client_id=${API_KEY}&scope=read_products,write_products&redirect_uri=https://your-app-name.netlify.app/api/auth/callback`;

    return {
        statusCode: 302,
        headers: {
            Location: redirectUrl,
        },
    };
};
