export const productModel = `
  if (!customElements.get('product-model')) {
    customElements.define('product-model', class ProductModel extends DeferredMedia {
      constructor() {
        super();
      }
  
      loadContent() {
        super.loadContent();
  
        Shopify.loadFeatures([
          {
            name: 'model-viewer-ui',
            version: '1.0',
            onLoad: this.setupModelViewerUI.bind(this),
          },
        ]);
      }
  
      setupModelViewerUI(errors) {
        if (errors) return;
  
        const modelViewer = this.querySelector('model-viewer');
        if (modelViewer) {
          const trillionWidget = document.createElement('div');
          trillionWidget.id = 'trillion-widget';
  
          trillionWidget.dataset.src = modelViewer.getAttribute('src');
          trillionWidget.dataset.alt = modelViewer.getAttribute('alt');
  
          modelViewer.replaceWith(trillionWidget);
        }
      }
    });
  }
`