import React, { useState, useEffect } from 'react';
import { Page, TextField, Button, Card, Layout } from '@shopify/polaris';

const Dashboard = () => {
    const [apiKey, setApiKey] = useState('');
    const [shop, setShop] = useState<string | null>(null);

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
