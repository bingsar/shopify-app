import React, { useState, useEffect } from 'react';
import {Page, TextField, Button, Card, Layout, Text, Tag, SkeletonBodyText} from '@shopify/polaris';

const Dashboard = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [apiKey, setApiKey] = useState('');
    const [shop, setShop] = useState<string | null>(null);
    const [trillionApiKey, setTrillionApiKey] = useState<string | null>(null)

    const fetchApiKey = async (shop: string) => {
        try {
            const response = await fetch(`/.netlify/functions/getTrillionApiKey?shop=${shop}`);
            const data = await response.json();
            if (data.trillion_api_key) {
                setTrillionApiKey(data.trillion_api_key);
            } else {
                console.error('No API key found');
            }
        } catch (err) {
            console.error('Failed to fetch the API key');
        }
    };

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
            .then((data) => {
                if (data.success) {
                    fetchApiKey(data.shop).then(() => {setLoading(false)})
                } else {
                    console.error(data.error);
                }
            })
            .catch((err) => console.error('Error:', err));
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
                                    <Text variant="headingLg" as="h5">
                                        Trillion Api Key
                                    </Text>
                                    <Tag>
                                        {trillionApiKey}
                                    </Tag>
                                    <div style={{ display: "flex", gap: "20px" }}>
                                        <Button fullWidth={false} onClick={handleSaveApiKey}>
                                            Edit
                                        </Button>
                                        <Button variant="primary" tone="critical" fullWidth={false} onClick={handleSaveApiKey}>
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
