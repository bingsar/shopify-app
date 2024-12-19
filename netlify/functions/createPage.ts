import {Handler} from "@netlify/functions/dist/main";
import {createClient} from "@supabase/supabase-js";

const REACT_APP_SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || '';
const REACT_APP_SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY || '';
const supabase = createClient(REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_KEY);

export const handler: Handler = async (event) => {
    try {
        const {shop, apiKey} = JSON.parse(event.body || '{}');
        if (!shop || !apiKey) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing shop or API key' }),
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

        const query = `
            mutation createPage($page: PageCreateInput!) {
              pageCreate(page: $page) {
                page {
                  id
                  title
                  handle
                  templateSuffix
                }
                userErrors {
                  field
                  message
                }
              }
            }
        `

        const variables = {
            page: {
                title: 'Trillion Try-on',
                handle: 'trillion-tryon',
                templateSuffix: 'trillion-tryon',
            }
        };

        const response = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
            },
            body: JSON.stringify({ query: query, variables }),
        });

        const createData = await response.json();

        if (!response.ok || createData.errors) {
            console.error('Error create page:', createData.errors || createData);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: createData.errors || 'Failed to create page' }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Page Trillion Try-on was successfully created',
                page: createData.data.pageCreate.page,
            }),
        };
    } catch (e) {
        console.error('Failed handle function create page:', e)
    }
}