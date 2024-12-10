export const getTrillionViewerScriptContent = async (apiKey: string) => `
    <script type="module">
      import { TrillionViewerApp } from "https://sdk.trillion.jewelry/viewer/0.38.6/trillion-viewer.js";

      const activationKey = "${apiKey}";
      const jewelryId = "{{ product.selected_or_first_available_variant.sku }}";
      const slideSelector = '#trillion-viewer';

      // Initialize the script when the DOM content is fully loaded
      document.addEventListener("DOMContentLoaded", async () => {
        try {
          await checkJewelryExists();
          await waitForElm(slideSelector);
        } catch (error) {
          console.error(error.message);
        }
      });

      // Function to initialize the Trillion Viewer
      async function trillionViewerInit(elem) {
        elem.innerHTML = '';

        const trillionViewer = new TrillionViewerApp();

        trillionViewer.init(elem);
        trillionViewer.setServiceActivationKey(activationKey);
        trillionViewer.setJewelryID(jewelryId);
        await trillionViewer.refresh();
      }

      // Function to check if the jewelry exists and is published
      async function checkJewelryExists() {
        const response = await fetch(\`https://dashboard.trillion.jewelry/api/trillionwebapp/publication-status/\${jewelryId}\`, {
          method: "GET",
          headers: {
            "Accept": "application/json",
          }
        });
        const data = await response.json();

        if (!data.isPublishedWebSDK) {
          throw new Error('[Trillion 3D Viewer] Product is not published');
        }
      }

      // Function to wait for the element to be available in the DOM
      function waitForElm(selector) {
        return new Promise(resolve => {
          const elem = document.querySelector(selector);
          if (elem) {
            trillionViewerInit(elem);
            return;
          }

          const observer = new MutationObserver(mutations => {
            const elem = document.querySelector(selector);
            if (elem) {
              observer.disconnect();
              trillionViewerInit(elem);
            }
          });

          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        });
      }
    </script>
`;
