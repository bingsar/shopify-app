import React, { useState, useEffect } from 'react';
import {Page, TextField, Button, Card, Layout, Text, Tag, SkeletonBodyText} from '@shopify/polaris';
import {ImportSkus} from "./ImportSkus";

const Dashboard = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [apiKey, setApiKey] = useState('');
    const [shop, setShop] = useState<string>('');
    const [trillionApiKey, setTrillionApiKey] = useState<string | null>(null)

    const fetchApiKey = async (shop: string) => {
        try {
            const response = await fetch(`/.netlify/functions/getTrillionApiKey?shop=${shop}`);
            const data = await response.json();
            if (data.trillion_api_key) {
                setTrillionApiKey(data.trillion_api_key);
            } else {
                setTrillionApiKey(null)
                console.error('No API key found');
            }
        } catch (err) {
            console.error('Failed to fetch the API key');
        }
    };

    const createPageRequest = async (shop: string, apiKey: string) => {
        try {
            const response = await fetch('/.netlify/functions/createPage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    shop,
                    apiKey,
                }),
            })
            const data = await response.json();
            if (data.success) {
                console.log('Page for Trillion Try-on was created')
            } else {
                console.error('Error with create page request');
            }
        } catch (err) {
            console.error('Failed to create a page:', err);
        }
    };

    const updateThemeFile = async (shop: string) => {
        try {
            const response = await fetch('/.netlify/functions/updateThemeFile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    shop,
                }),
            })
            const data = await response.json();
            if (data.success) {
                console.log('Theme.liquid was updated')
            } else {
                console.error('Error with updating theme.liquid request');
            }
        } catch (err) {
            console.error('Failed to update theme.liquid:', err);
        }
    };

    const uploadViewerElementFile = async (shop: string) => {
        try {
            const response = await fetch(`/.netlify/functions/uploadViewerElement`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    shop
                }),
            });

            const data = await response.json();

            if (data.success) {
                console.log('File product-model.js was successfully uploaded')
            } else {
                console.error('Error with uploading product-model.js file');
            }
        } catch (err) {
            console.error('Failed to upload product-model.js');
        }
    }

    const uploadViewerScript = async (shop: string, apiKey:string) => {
        try {
            const response = await fetch(`/.netlify/functions/uploadTrillionViewerScript`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    shop,
                    apiKey
                }),
            });

            const data = await response.json();

            if (data.success) {
                console.log('File trillion-viewer.liquid was successfully uploaded')
            } else {
                console.error('Error with uploading trillion-viewer.liquid  file');
            }
        } catch (err) {
            console.error('Failed to upload trillion-viewer.liquid ');
        }
    }

    const createTrillionSkuExistDefinition = async (shop: string) => {
        try {
            const response = await fetch('/.netlify/functions/createTrillionSkuExistDefinition', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    shop,
                }),
            })
            const data = await response.json();
            if (data.success) {
                console.log('Trillion Sku Exist definition was created')
            } else {
                console.error('Error with create Trillion Sku Exist definition request');
            }
        } catch (err) {
            console.error('Failed to create Trillion Sku Exist definition:', err);
        }
    }

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const shopFromUrl = urlParams.get('shop');
        if (shopFromUrl) {
            setShop(shopFromUrl);
            fetchApiKey(shopFromUrl).then(() => {setLoading(false)})
        } else {
            fetch('/.netlify/functions/getShop')
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Failed to fetch shop');
                    }
                    return response.json();
                })
                .then((data) => {
                    if (data.shop) {
                        setShop(data.shop);
                        fetchApiKey(data.shop).then(() => {setLoading(false)})
                    }
                })
                .catch((err) => {
                    console.error('Error fetching shop:', err);
                });
        }
    }, []);

    const handleSaveApiKey = () => {
        setLoading(true)
        fetch('/.netlify/functions/uploadTemplate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                shop,
                apiKey,
            }),
        })
            .then((response) => response.json())
            .then(async (data) => {
                if (data.success) {
                    await fetchApiKey(shop)
                    await createPageRequest(shop, apiKey)
                    await uploadViewerElementFile(shop)
                    await uploadViewerScript(shop, apiKey)
                    await updateThemeFile(shop)
                    await createTrillionSkuExistDefinition(shop)
                    setLoading(false)
                } else {
                    console.error(data.error);
                }
            })
            .catch((err) => console.error('Error:', err));
    };

    const handleDeleteApiKey = async () => {
        setLoading(true)
        const response = await fetch(`/.netlify/functions/deleteApiKey`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ shop_domain: shop, trillionApiKey: apiKey }),
        });

        if (!response.ok) {
            throw new Error('Failed to delete API key');
        }
        await fetchApiKey(shop).then(() => {setLoading(false)})
        return response.json();
    };

    const handleUploadGLB = async () => {
        setLoading(true)
        const response = await fetch(`/.netlify/functions/uploadGlbToMedia`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ shop_domain: shop, trillionApiKey: apiKey }),
        });

        if (!response.ok) {
            throw new Error('Failed to upload GLB models');
        }
        setLoading(false)
        return response.json();
    }

    return (
        <Page title="Dashboard">
                <Layout.Section>
                    <div style={{display: 'grid', gap: '20px'}}>
                        <Card>
                            <div>
                                {loading &&
                                    <SkeletonBodyText lines={3} />
                                }
                                {(!trillionApiKey && !loading) && (
                                    <>
                                        <TextField
                                            label="Trillion API Key"
                                            value={apiKey}
                                            onChange={(value) => setApiKey(value)}
                                            autoComplete="off"

                                        />
                                        <br/>
                                        <Button variant={'primary'} fullWidth={false} onClick={handleSaveApiKey}>
                                            Save API Key
                                        </Button>
                                    </>
                                )}
                                {(trillionApiKey && !loading) && (
                                    <div style={{ display: "inline-grid", gap: "10px" }}>
                                        <Text variant="headingLg" as="h6">
                                            Trillion Api Key
                                        </Text>
                                        <Tag>
                                            {trillionApiKey}
                                        </Tag>
                                        <div style={{ display: "flex", gap: "20px" }}>
                                            <Button variant="primary" tone="critical" fullWidth={false} onClick={handleDeleteApiKey}>
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                        {shop &&
                            <Card>
                                {shop}
                            </Card>
                        }
                        <ImportSkus apiKey={trillionApiKey} shop={shop} />

                        <Card>
                            <Button variant="primary" tone="success" fullWidth={false} onClick={handleUploadGLB}>
                                Upload GLB
                            </Button>
                        </Card>
                    </div>
                </Layout.Section>
        </Page>
    );
};

export default Dashboard;
