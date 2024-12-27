import { Handler } from "@netlify/functions/dist/main";
import {getShopAuthToken} from "./helpers/getShopAuthToken";

export const handler: Handler = async (event) => {
    console.log('handler', event.body);
    try {
        const { shop, trillionApiKey } = JSON.parse(event.body || '{}');

        if (!shop) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required parameters' }),
            };
        }

        const SHOPIFY_ACCESS_TOKEN = await getShopAuthToken(shop)

        const fetchProductsWithMetafieldsQuery = `
            {
                products(first: 250) {
                    edges {
                        node {
                            id
                            title
                            variants(first: 10) {
                                edges {
                                    node {
                                        id
                                        sku
                                    }
                                }
                            }
                            metafields(first: 10, namespace: "trillion") {
                                edges {
                                    node {
                                        key
                                        value
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
                body: JSON.stringify({ query: fetchProductsWithMetafieldsQuery }),
            }
        );

        if (!shopifyResponse.ok) {
            throw new Error('Failed to fetch Shopify products');
        }

        const shopifyProductsData = await shopifyResponse.json();

        const products = shopifyProductsData?.data?.products?.edges;

        if (!products) {
            console.error('No products found');
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'No products found' }),
            };
        }

        const filteredProducts = products.filter((productEdge: any) => {
            const metafields = productEdge.node.metafields.edges;
            return metafields.some(
                (metafield: any) =>
                    metafield.node.key === 'sku_exist' &&
                    metafield.node.value === 'true'
            );
        });

        console.log('Filtered Products:', filteredProducts);

        for (const productEdge of filteredProducts) {
            const product = productEdge.node;
            const sku = product.variants.edges[0]?.node.sku;

            if (!sku) {
                console.error(`No SKU found for product ${product.id}`);
                continue;
            }

            const backendResponse = await fetch(
                `${process.env.REACT_APP_BACKEND_URL}/api/trillionwebapp/config/viewer/${sku}?key=${trillionApiKey}`
            );

            if (!backendResponse.ok) {
                console.error(`Failed to fetch glbFileUrl for SKU: ${sku}`);
                continue;
            }

            const { modelPath } = await backendResponse.json();

            if (!modelPath) {
                console.error(`No glbFileUrl found for SKU: ${modelPath}`);
                continue;
            }

            console.log('modelPath', modelPath)

            // GraphQL Mutation to upload `.glb` file to product media
            const uploadMediaMutation = `
                mutation {
                    productCreateMedia(
                        productId: "${product.id}",
                        media: {
                            originalSource: "${modelPath}",
                            mediaContentType: MODEL_3D
                        }
                    ) {
                        media {
                            alt
                            id
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }
            `;

            const mediaResponse = await fetch(
                `https://${shop}/admin/api/2024-10/graphql.json`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                    },
                    body: JSON.stringify({ query: uploadMediaMutation }),
                }
            );

            const mediaData = await mediaResponse.json();

            if (mediaData.errors || mediaData.data.productCreateMedia.userErrors.length > 0) {
                console.error(
                    `Failed to upload media for product ${product.id}:`,
                    mediaData.errors || mediaData.data.productCreateMedia.userErrors
                );
            } else {
                console.log(`Successfully uploaded media for product ${product.id}`);
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Media uploaded successfully' }),
        };
    } catch (error: any) {
        console.error('Error:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
