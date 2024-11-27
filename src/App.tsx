import React, { useState } from 'react';

const App: React.FC = () => {
    const [apiKey, setApiKey] = useState<string>('');
    const [response, setResponse] = useState<string>('');

    const handleSubmit = async () => {
        try {
            const res = await fetch('/.netlify/functions/storeManagement', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey }),
            });

            const data = await res.json();
            if (res.ok) {
                setResponse('Store added successfully!');
            } else {
                setResponse(data.error || 'Something went wrong');
            }
        } catch (error) {
            setResponse('Error submitting API key');
        }
    };

    return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <label>
                Trillion API Key:
                <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    style={{ marginLeft: '10px' }}
                />
            </label>
            <button onClick={handleSubmit} style={{ marginLeft: '10px' }}>
                Submit
            </button>
            <p>{response}</p>
        </div>
    );
};

export default App;
