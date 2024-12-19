import {Handler} from "@netlify/functions/dist/main";
import {supabase} from "../../supabase";
import {getActiveThemeId} from "./helpers/getActiveThemeId";

export const handler: Handler = async (event) => {
    console.log('handler', event.body)
    try {
        const { shop, apiKey } = JSON.parse(event.body || '{}');

        if (!apiKey || !shop) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required parameters' }),
            };
        }
        console.log('apiKey', apiKey)
        console.log('shop', shop)
        const { data, error } = await supabase
            .from('stores')
            .select('access_token')
            .eq('shop_domain', shop)
            .single();
        console.log('data', data)
        if (error || !data?.access_token) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Access token not found for shop' }),
            };
        }

        const SHOPIFY_ACCESS_TOKEN = data.access_token;

        console.log('SHOPIFY_ACCESS_TOKEN', SHOPIFY_ACCESS_TOKEN)

        const backendResponse = await fetch(
            `${process.env.REACT_APP_BACKEND_URL}/api/trillionwebapp/products/skus?apiKey=${apiKey}`
        );

        if (!backendResponse.ok) {
            throw new Error('Failed to fetch SKUs from the backend');
        }

        const backendSkus: string[] = await backendResponse.json();

        console.log('backendSkus', backendSkus)

        const themeId = await getActiveThemeId(SHOPIFY_ACCESS_TOKEN, shop)

        const fetchProductsQuery = `
            {
                products(first: 250) {
                    edges {
                        node {
                            id
                            title
                            variants(first: 100) {
                                edges {
                                    node {
                                        id
                                        sku
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const shopifyResponse = await fetch(
            `https://${shop}/admin/api/2024-10/graphql.json`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                },
                body: JSON.stringify({ query: fetchProductsQuery }),
            }
        );

        if (!shopifyResponse.ok) {
            throw new Error('Failed to fetch Shopify products');
        }

        const shopifyProductsData = await shopifyResponse.json();
        const shopifyProducts = shopifyProductsData.data.products.edges;
        console.log('shopifyProducts', shopifyProducts)
        const matchedSkus: string[] = [];

        // Iterate over products and match SKUs
        for (const productEdge of shopifyProducts) {
            const product = productEdge.node;
            const matchingVariants = product.variants.edges.filter((variantEdge: any) =>
                backendSkus.includes(variantEdge.node.sku)
            );
            console.log('matchingVariants', matchingVariants)
            if (matchingVariants.length > 0) {
                matchedSkus.push(product.id);

                // GraphQL Mutation to create metafield
                const createMetafieldMutation = `
                    mutation {
                        productUpdate(input: {
                            id: "${product.id}",
                            metafields: [
                                {
                                    namespace: "trillion",
                                    key: "sku_exist",
                                    value: "true",
                                    type: "boolean"
                                }
                            ]
                        }) {
                            product {
                                id
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `;

                const metafieldResponse = await fetch(
                    `https://${shop}/admin/api/2024-10/graphql.json`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                        },
                        body: JSON.stringify({ query: createMetafieldMutation }),
                    }
                );

                const metafieldData = await metafieldResponse.json();

                console.log('metafieldData', metafieldData)
                if (metafieldData.errors || metafieldData.data.productUpdate.userErrors.length > 0) {
                    console.error(
                        `Failed to create metafield for product ${product.id}:`,
                        metafieldData.errors || metafieldData.data.productUpdate.userErrors
                    );
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
