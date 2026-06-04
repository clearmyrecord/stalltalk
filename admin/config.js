// GitHub Pages cannot safely call OpenAI directly.
// Set this to your deployed Vercel app endpoint, for example:
// window.STALLTALK_AD_IMAGE_ENDPOINT = "https://your-vercel-app.vercel.app/api/generate-ad-image";
window.STALLTALK_AD_IMAGE_ENDPOINT = window.STALLTALK_AD_IMAGE_ENDPOINT || "/api/generate-ad-image";
