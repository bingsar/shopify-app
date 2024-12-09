import {Handler} from "@netlify/functions/dist/main";
import {productModel} from "./templates/product-model";
import {getShopAuthToken} from "./helpers/getShopAuthToken";
import {getActiveThemeId} from "./helpers/getActiveThemeId";

export const handler: Handler = async (event) => {
    try {
        const { shop } = JSON.parse(event.body || '{}');

        if (!shop) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing shop' }),
            };
        }

        const SHOPIFY_ACCESS_TOKEN = await getShopAuthToken(shop)
        console.log('SHOPIFY_ACCESS_TOKEN', SHOPIFY_ACCESS_TOKEN)

        const themeId = await getActiveThemeId(SHOPIFY_ACCESS_TOKEN, shop)

        console.log('Active theme ID:', themeId);

        const mutation = `
            mutation themeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
              themeFilesUpsert(files: $files, themeId: $themeId) {
                upsertedThemeFiles {
                  filename
                }
                userErrors {
                  field
                  message
                }
              }
            }
        `;

        const variables = {
            files: [
                {
                    filename: 'assets/product-model.js',
                    body: {
                        type: 'TEXT',
                        value: productModel,
                    },
                },
            ],
            themeId: themeId,
        };

        const uploadResponse = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
            },
            body: JSON.stringify({ query: mutation, variables }),
        });

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok || uploadData.errors) {
            console.error('Error uploading product-model.js:', uploadData.errors || uploadData);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: uploadData.errors || 'Failed to upload product-model.js' }),
            };
        }

        console.log('product-model.js uploaded successfully:', uploadData);

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true }),
        };
    } catch (e) {
        console.error('Failed handle function upload file product-model.js: ', e);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
