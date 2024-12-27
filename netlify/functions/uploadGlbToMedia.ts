import { Handler } from "@netlify/functions/dist/main";
import { getShopAuthToken } from "./helpers/getShopAuthToken";
import {getFileSizeByUrl} from "./helpers/getFileSizeByUrl";

export const handler: Handler = async (event) => {
    try {
        const { shop_domain, trillionApiKey } = JSON.parse(event.body || '{}');

        if (!shop_domain || !trillionApiKey) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required parameters shop_domain or ApiKey' }),
            };
        }

        const SHOPIFY_ACCESS_TOKEN = await getShopAuthToken(shop_domain);

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
            `https://${shop_domain}/admin/api/2024-10/graphql.json`,
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

            console.log('trillionApiKey', trillionApiKey);

            const url = `${process.env.REACT_APP_BACKEND_URL}/api/trillionwebapp/config/viewer/${encodeURIComponent(sku)}?key=${encodeURIComponent(trillionApiKey)}`;

            const backendResponse = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Referer': `https://${shop_domain}`,
                },
            });

            if (!backendResponse.ok) {
                console.error(`Failed to fetch glbFileUrl for SKU: ${sku}`);
                continue;
            }

            const { modelPath } = await backendResponse.json();

            if (!modelPath) {
                console.error(`No glbFileUrl found for SKU: ${sku}`);
                continue;
            }

            const fileSize = await getFileSizeByUrl(modelPath)
            console.log('fileSize', fileSize)
            console.log('modelPath', modelPath);

            // Step 1: Create staged upload
            const stagedUploadsCreateMutation = `
                mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
                    stagedUploadsCreate(input: $input) {
                        stagedTargets {
                            url
                            resourceUrl
                            parameters {
                                name
                                value
                            }
                        }
                        userErrors {
                            field
                            message
                        }
                    }
                }
            `;

            const stagedUploadInput = [
                {
                    filename: `${sku}.glb`,
                    mimeType: "model/gltf-binary",
                    resource: "MODEL_3D",
                    fileSize: fileSize.toString(),
                    httpMethod: "POST",
                }
            ];

            const stagedResponse = await fetch(
                `https://${shop_domain}/admin/api/2024-10/graphql.json`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                    },
                    body: JSON.stringify({ query: stagedUploadsCreateMutation, variables: { input: stagedUploadInput } }),
                }
            );

            const stagedData = await stagedResponse.json();

            if (stagedData.errors || stagedData.data.stagedUploadsCreate.userErrors.length > 0) {
                console.error(
                    `Failed to create staged upload for product ${product.id}:`,
                    stagedData.errors || stagedData.data.stagedUploadsCreate.userErrors
                );
                continue;
            }

            const stagedTarget = stagedData.data.stagedUploadsCreate.stagedTargets[0];

            // Step 2: Upload file to the staged URL
            console.log('stagedTarget.url', stagedTarget.url)
            console.log('stagedTarget.resourceUrl', stagedTarget.resourceUrl)

            // Step 3: Attach uploaded media to product
            const productUpdateMutation = `
                mutation {
                    productUpdate(
                        input: {
                            id: "${product.id}",
                            media: [
                                {
                                    mediaContentType: MODEL_3D,
                                    alt: "3D Model",
                                    originalSource: "${stagedTarget.url}"
                                }
                            ]
                        }
                    ) {
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

            const mediaResponse = await fetch(
                `https://${shop_domain}/admin/api/2024-10/graphql.json`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                    },
                    body: JSON.stringify({ query: productUpdateMutation }),
                }
            );

            const mediaData = await mediaResponse.json();

            if (mediaData.errors || mediaData.data.productUpdate.userErrors.length > 0) {
                console.error(
                    `Failed to attach media to product ${product.id}:`,
                    mediaData.errors || mediaData.data.productUpdate.userErrors
                );
            } else {
                console.log(`Successfully attached media to product ${product.id}`);
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
