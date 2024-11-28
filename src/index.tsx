import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { AppProvider } from '@shopify/polaris';
import '@shopify/polaris/build/esm/styles.css';

ReactDOM.render(
    <AppProvider>
        <App />
    </AppProvider>,
    document.getElementById('root')
);