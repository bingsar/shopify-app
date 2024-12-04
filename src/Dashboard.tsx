import React, { useState, useEffect } from 'react';
import {Page, TextField, Button, Card, Layout, Text, Tag} from '@shopify/polaris';

const Dashboard = () => {
    const [apiKey, setApiKey] = useState('');
    const [shop, setShop] = useState<string | null>(null);
    const [trillionApiKey, setTrillionApiKey] = useState<string | null>(null)

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const shopFromUrl = urlParams.get('shop');
        if (shopFromUrl) {
            setShop(shopFromUrl);
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
                    }
                })
                .catch((err) => {
                    console.error('Error fetching shop:', err);
                });
        }
    }, []);

    useEffect(() => {
        const fetchApiKey = async () => {
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

        fetchApiKey();
    }, []);

    const handleSaveApiKey = () => {
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
                    alert('Page and API Key saved successfully!');
                } else {
                    console.error(data.error);
                    alert('Error saving API Key or creating page.');
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
                            {!trillionApiKey ? (
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
                                ) : (
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
                                )
                            }

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
