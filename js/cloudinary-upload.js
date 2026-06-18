(function () {
  "use strict";

  async function uploadBlob(blob, options) {
    const config = {
      cloudName: window.STALLTALK_CLOUDINARY_CLOUD_NAME,
      uploadPreset: window.STALLTALK_CLOUDINARY_UPLOAD_PRESET,
      folder: "stalltalk-ads",
      ...(options || {})
    };
    if (!config.cloudName || !config.uploadPreset) throw new Error("Cloudinary cloud name and unsigned upload preset are required.");
    const formData = new FormData();
    formData.set("file", blob);
    formData.set("upload_preset", config.uploadPreset);
    formData.set("folder", config.folder);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`, { method: "POST", body: formData });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.secure_url) throw new Error(data.error?.message || "Cloudinary upload failed.");
    return data.secure_url;
  }

  window.StallTalkCloudinaryUpload = { uploadBlob };
})();
