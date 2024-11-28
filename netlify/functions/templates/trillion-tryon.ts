export const getTrillionTryonContent = (apiKey: string) => `
  <div id="trillion-widget"></div>
  <style>
    body > *:not(#MainContent):not(#PageContainer) {
      display: none;
    }
    body {
      overflow: hidden;
    }
    #trillion-widget {
      display: block;
      position: fixed;
      left: 0;
      top: 0;
      z-index: 99;
      height: 100%;
      width: 100%;
    }
  </style>
  <script type="module">
    import { TrillionWidgetApp } from "https://sdk.trillion.jewelry/widget/0.38.6/trillion-widget.js";
    const activationKey = "${apiKey}";
    const elem = document.querySelector("#trillion-widget");
    export const trillionWidget = new TrillionWidgetApp();
    trillionWidget.init(elem);
    trillionWidget.setServiceActivationKey(activationKey);
    const urlParams = new URLSearchParams(window.location.search);
    const jewelryId = urlParams.get("sku");
    if (jewelryId) {
      trillionWidget.setJewelryID(jewelryId);
    }
    trillionWidget.refresh();
  </script>
`;