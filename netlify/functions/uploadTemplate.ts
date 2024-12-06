import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import { getTrillionTryonContent } from './templates/trillion-tryon';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const handler: Handler = async (event) => {
    try {
        const { shop, apiKey } = JSON.parse(event.body || '{}');
        console.log('Request received:', { shop, apiKey });

        if (!shop || !apiKey) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing shop or API key' }),
            };
        }

        // Fetch the access token from Supabase
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

        const graphqlQuery = `
            query {
              themes(first: 10) {
                edges {
                  node {
                    id
                    name
                    role
                  }
                }
              }
            }
        `;

        const themesResponse = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
            },
            body: JSON.stringify({ query: graphqlQuery }),
        });

        const themesData = await themesResponse.json();

        if (!themesResponse.ok || themesData.errors) {
            console.error('Error fetching themes:', themesData.errors || themesData);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: themesData.errors || 'Failed to fetch themes' }),
            };
        }

        const themes = themesData.data.themes.edges;
        const activeTheme = themes.find((theme: any) => theme.node.role === 'MAIN');
        if (!activeTheme) {
            throw new Error('Active theme not found.');
        }

        const themeId = activeTheme.node.id;

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
