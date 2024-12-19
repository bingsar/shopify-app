import {Button, Card, SkeletonBodyText, Text} from "@shopify/polaris";
import React, {useState} from "react";

interface ImportSkusProps {
    apiKey: string | null;
    shop: string;
}

export const ImportSkus = ({apiKey, shop}: ImportSkusProps) => {
  const [loading, setLoading] = useState<boolean>(false);

  const handleImportSkus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/.netlify/functions/importSkusAndCreateMetafields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          shop,
        }),
      })
      const data = await response.json();
      if (data.success) {
        console.log('SKUs were imported');
      } else {
        console.error('Error with import SKUs request');
      }
    } catch (err) {
      console.error('Failed to import SKUs:', err);
    } finally {
      setLoading(false);
    }
  }
  return (
      <Card>
          <div>
              {loading &&
                  <SkeletonBodyText lines={1} />
              }
              {(!apiKey && !loading) && (
                  <>
                      <div>Please add Trillion ApiKey</div>
                  </>
              )}
              {(apiKey && !loading) && (
                  <div style={{ display: "inline-grid", gap: "10px" }}>
                      <Text variant="headingLg" as="h6">
                          Import SKUs
                      </Text>
                      <div style={{ display: "flex", gap: "20px" }}>
                          <Button variant="primary" fullWidth={false} onClick={handleImportSkus}>
                              Import
                          </Button>
                      </div>
                  </div>
              )}
          </div>
      </Card>
  )
}