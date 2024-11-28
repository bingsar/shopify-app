import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { AppProvider } from '@shopify/polaris';
import '@shopify/polaris/build/esm/styles.css';

ReactDOM.render(
    <React.StrictMode>
        <AppProvider i18n={{}}>
            <App />
        </AppProvider>
    </React.StrictMode>,
    document.getElementById('root')
);