import React, { useState, useEffect } from 'react';
import { Page, TextField, Button, Card, Layout } from '@shopify/polaris';

const Dashboard = () => {
    const [apiKey, setApiKey] = useState('');
    const [shop, setShop] = useState<string | null>(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const shop = urlParams.get('shop');
        setShop(shop);
    }, []);

    const handleSaveApiKey = () => {
        // Logic to save API Key in your Supabase or API backend
        console.log('API Key:', apiKey);
    };

    return (
        <Page title="Dashboard">
                <Layout.Section>
                    <Card>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <TextField
                                label="Trillion API Key"
                                value={apiKey}
                                onChange={(value) => setApiKey(value)}
                                autoComplete="off"

                            />
                            <Button onClick={handleSaveApiKey}>
                                Save API Key
                            </Button>
                        </div>
                    </Card>
                </Layout.Section>
        </Page>
    );
};

export default Dashboard;