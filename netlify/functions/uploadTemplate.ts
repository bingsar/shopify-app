import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import { getTrillionTryonContent } from './templates/trillion-tryon';
import {getShopAuthToken} from "./helpers/getShopAuthToken";
import {getActiveThemeId} from "./helpers/getActiveThemeId";


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

        const themeId = getActiveThemeId(SHOPIFY_ACCESS_TOKEN, shop)

        console.log('Active theme ID:', themeId);

        // Generate the template content
        const templateContent = getTrillionTryonContent(apiKey);

        // Upload the template using GraphQL mutation
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
                    filename: 'templates/page.trillion-tryon.liquid',
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
            console.error('Error uploading template:', uploadData.errors || uploadData);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: uploadData.errors || 'Failed to upload template' }),
            };
        }

        console.log('Template uploaded successfully:', uploadData);

        const { error: saveError } = await supabase
            .from('stores')
            .update({ trillion_api_key: apiKey })
            .eq('shop_domain', shop);

        if (saveError) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Failed to save API key to database' }),
            };
        }

        console.log('API key saved to database for shop:', shop);

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
