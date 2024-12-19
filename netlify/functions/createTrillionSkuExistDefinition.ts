import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { getShopAuthToken } from './helpers/getShopAuthToken';

export const handler: Handler = async (event) => {
    try {
        const { shop } = JSON.parse(event.body || '{}');

        if (!shop) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing shop' }),
            };
        }

        const SHOPIFY_ACCESS_TOKEN = await getShopAuthToken(shop);

        if (!SHOPIFY_ACCESS_TOKEN) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Shopify access token not found for the shop' }),
            };
        }

        const createMetafieldDefinition = async (shop: string, accessToken: string) => {
            const query = `
                mutation {
                    metafieldDefinitionCreate(
                        definition: {
                            namespace: "trillion"
                            key: "sku_exist"
                            name: "SKU Exists"
                            type: "boolean"
                            description: "Indicates if the product SKU exists in Trillion backend."
                            ownerType: PRODUCT
                            visibleToStorefrontApi: true
                        }
                    ) {
                        createdDefinition {
                            id
                            name
                            namespace
                            key
                            type {
                                name
                                category
                            }
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }
              `;

            const response = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': accessToken,
                },
                body: JSON.stringify({ query }),
            });

            const data = await response.json();

            if (data.errors || data.data.metafieldDefinitionCreate.userErrors.length > 0) {
                console.error('Error creating metafield definition:', data.errors || data.data.metafieldDefinitionCreate.userErrors);
                throw new Error('Failed to create metafield definition');
            }

            console.log('Metafield definition created:', data.data.metafieldDefinitionCreate.createdDefinition);
        };

        await createMetafieldDefinition(shop, SHOPIFY_ACCESS_TOKEN);

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
