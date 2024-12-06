export const getFileId = async (shop: string, accessToken: string): Promise<string | null> => {
    const query = `
        query {
            files(first: 10) {
                edges {
                    node {
                        id
                        filename
                    }
                }
            }
        }
    `;

    const response = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({ query }),
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
        console.error('Error fetching files:', data.errors || data);
        throw new Error('Failed to fetch files');
    }

    const file = data.data.files.edges.find((file: any) => file.node.filename === 'product-model.js');
    return file?.node?.id || null;
};

export const updateFile = async (shop: string, accessToken: string, fileId: string, newContent: string): Promise<boolean> => {
    const stagedUploadQuery = `
        mutation CreateStagedUploadUrl($input: [StagedUploadInput!]!) {
            stagedUploadsCreate(input: $input) {
                stagedTargets {
                    url
                    parameters {
                        name
                        value
                    }
                }
                userErrors {
                    message
                    field
                }
            }
        }
    `;

    const stagedUploadVariables = {
        input: [
            {
                resource: "FILE",
                filename: "product-model.js",
                mimeType: "text/javascript",
                httpMethod: "POST",
            },
        ],
    };

    const stagedResponse = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({ query: stagedUploadQuery, variables: stagedUploadVariables }),
    });

    const stagedData = await stagedResponse.json();

    if (!stagedResponse.ok || stagedData.errors) {
        console.error('Error creating staged upload URL:', stagedData.errors || stagedData);
        throw new Error('Failed to create staged upload URL');
    }

    const { url, parameters } = stagedData.data.stagedUploadsCreate.stagedTargets[0];

    const formData = new FormData();
    parameters.forEach((param: { name: string; value: string }) => formData.append(param.name, param.value));
    formData.append('file', new Blob([newContent], { type: 'text/javascript' }));

    await fetch(url, { method: 'POST', body: formData });

    const fileUpdateQuery = `
        mutation FileUpdate($input: [FileUpdateInput!]!) {
            fileUpdate(files: $input) {
                userErrors {
                    code
                    field
                    message
                }
                files {
                    alt
                }
            }
        }
    `;

    const fileUpdateVariables = {
        input: [
            {
                id: fileId,
                filename: "product-model.js",
                originalSource: url,
            },
        ],
    };

    const fileUpdateResponse = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({ query: fileUpdateQuery, variables: fileUpdateVariables }),
    });

    const fileUpdateData = await fileUpdateResponse.json();

    if (!fileUpdateResponse.ok || fileUpdateData.errors) {
        console.error('Error updating file:', fileUpdateData.errors || fileUpdateData);
        throw new Error('Failed to update file');
    }

    return true;
};
