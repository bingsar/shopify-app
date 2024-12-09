export const getActiveThemeId = async (SHOPIFY_ACCESS_TOKEN: string, shop: string) => {
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

    return activeTheme.node.id
}