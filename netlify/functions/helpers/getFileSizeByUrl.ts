export async function getFileSizeByUrl(modelPath) {
    const response = await fetch(modelPath, { method: "HEAD" });
    if (!response.ok) {
        throw new Error(`Failed to fetch file size from URL: ${modelPath}`);
    }
    const contentLength = response.headers.get("content-length");
    if (!contentLength) {
        throw new Error(`Content-Length header is missing for URL: ${modelPath}`);
    }
    return contentLength;
}