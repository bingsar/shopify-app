import React, { useState, useEffect } from 'react';
import {Page, TextField, Button, Card, Layout, Text, Tag, SkeletonBodyText} from '@shopify/polaris';

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

    const createPageRequest = async () => {
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

    const uploadViewerElementFile = async (shop) => {
        try {
            const response = await fetch(`/.netlify/functions/uploadViewerElement`, {
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
                    await fetchApiKey(shop).then(() => {setLoading(false)})
                    await createPageRequest()
                    await uploadViewerElementFile(shop)
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
            body: JSON.stringify({ shop_domain: shop }),
        });

        if (!response.ok) {
            throw new Error('Failed to delete API key');
        }
        await fetchApiKey(shop).then(() => {setLoading(false)})
        return response.json();
    };

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
                    </div>
                </Layout.Section>
        </Page>
    );
};

export default Dashboard;
