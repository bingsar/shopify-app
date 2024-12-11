import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';
import { getShopAuthToken } from './helpers/getShopAuthToken';
import { getActiveThemeId } from './helpers/getActiveThemeId';

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
        const themeId = await getActiveThemeId(SHOPIFY_ACCESS_TOKEN, shop);

        const fetchResponse = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
            },
            body: JSON.stringify({
                query: `
                    {
                      themes(roles: MAIN, first: 1) {
                        nodes {
                          files(filenames: "*theme.liquid") {
                            nodes {
                              filename
                              body {
                                ... on OnlineStoreThemeFileBodyText {
                                  content
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                `,
            }),
        });

        const fetchData = await fetchResponse.json();

        if (!fetchResponse.ok || fetchData.errors) {
            console.error('Error fetching theme.liquid:', fetchData.errors || fetchData);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: fetchData.errors || 'Failed to fetch theme.liquid' }),
            };
        }

        let themeContent = fetchData.data.theme.file.content;

        const customCode = `
        {%- if request.page_type == 'product' -%}
          {%- render 'trillion-viewer' -%}
        {%- endif -%}
        `;

        themeContent = themeContent.replace('</body>', `${customCode}\n</body>`);

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
                    filename: 'layout/theme.liquid',
                    body: {
                        type: 'TEXT',
                        value: themeContent,
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
            console.error('Error uploading theme.liquid:', uploadData.errors || uploadData);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: uploadData.errors || 'Failed to upload modified theme.liquid' }),
            };
        }

        console.log('theme.liquid updated successfully:', uploadData);

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
