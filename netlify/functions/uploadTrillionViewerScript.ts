import { Handler } from '@netlify/functions';
import {getShopAuthToken} from "./helpers/getShopAuthToken";
import {getActiveThemeId} from "./helpers/getActiveThemeId";
import {getTrillionViewerScriptContent} from "./templates/trillion-viewer";

export const handler: Handler = async (event) => {
    try {
        const { shop, apiKey } = JSON.parse(event.body || '{}');

        if (!shop || !apiKey) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing shop or API key' }),
            };
        }

        const SHOPIFY_ACCESS_TOKEN = await getShopAuthToken(shop)
        const themeId = await getActiveThemeId(SHOPIFY_ACCESS_TOKEN, shop)
        const templateContent = await getTrillionViewerScriptContent(apiKey);
        console.log('templateContent viewer script', templateContent)

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
                    filename: 'snippets/trillion-viewer.liquid',
                    body: {
                        type: 'TEXT',
                        value: templateContent,
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
            console.error('Error uploading trillion-viewer.liquid:', uploadData.errors || uploadData);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: uploadData.errors || 'Failed to upload trillion-viewer.liquid' }),
            };
        }

        console.log('trillion-viewer.liquid uploaded successfully:', uploadData);

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
