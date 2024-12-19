import {Handler} from "@netlify/functions/dist/main";
import {createClient} from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const handler: Handler = async (event: any) => {
    try {
        const { apiKey, shop } = JSON.parse(event.body);

        if (!apiKey || !shop) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required parameters' }),
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

        const backendResponse = await fetch(
            `${process.env.BACKEND_URL}/trillionwebapp/products/skus?apiKey=${apiKey}`
        );

        if (!backendResponse.ok) {
            throw new Error('Failed to fetch SKUs from the backend');
        }

        const backendSkus: string[] = await backendResponse.json();

        const shopifyResponse = await fetch(
            `https://${shop}/admin/api/2023-10/products.json`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                },
            }
        );

        if (!shopifyResponse.ok) {
            throw new Error('Failed to fetch Shopify products');
        }

        const shopifyProducts = (await shopifyResponse.json()).products;

        const matchedSkus: string[] = [];

        for (const product of shopifyProducts) {
            const matchingVariants = product.variants.filter((variant: any) =>
                backendSkus.includes(variant.sku)
            );

            if (matchingVariants.length > 0) {
                matchedSkus.push(product.id);

                // Create metafield for the product
                const metafieldResponse = await fetch(
                    `https://${shop}/admin/api/2023-10/products/${product.id}/metafields.json`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                        },
                        body: JSON.stringify({
                            metafield: {
                                namespace: 'trillion',
                                key: 'sku_exist',
                                value: 'true',
                                type: 'boolean',
                            },
                        }),
                    }
                );

                if (!metafieldResponse.ok) {
                    console.error(`Failed to create metafield for product ${product.id}`);
                }
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ matchedSkus }),
        };
    } catch (error: any) {
        console.error('Error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
