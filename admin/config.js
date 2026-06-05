// GitHub Pages cannot safely call OpenAI directly.
// Set this to your deployed Vercel app base URL, for example:
// window.STALLTALK_API_BASE_URL = "https://your-vercel-app.vercel.app";
window.STALLTALK_API_BASE_URL = window.STALLTALK_API_BASE_URL || "https://YOUR-VERCEL-DEPLOYMENT-URL.vercel.app";

// Backward-compatible endpoint value for older cached admin bundles.
window.STALLTALK_AD_IMAGE_ENDPOINT = window.STALLTALK_AD_IMAGE_ENDPOINT || `${window.STALLTALK_API_BASE_URL}/api/generate-ad-image`;
