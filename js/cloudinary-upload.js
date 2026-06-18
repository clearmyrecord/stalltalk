const env = typeof import.meta !== "undefined" ? import.meta.env || {} : {};

export const CLOUDINARY_CLOUD_NAME = env.VITE_CLOUDINARY_CLOUD_NAME || window.STALLTALK_CLOUDINARY_CLOUD_NAME || "ddp2yv3k3";
export const CLOUDINARY_UPLOAD_PRESET = env.VITE_CLOUDINARY_UPLOAD_PRESET || window.STALLTALK_CLOUDINARY_UPLOAD_PRESET || "stalltalk_ads";

export async function uploadAdBlob(blob, options = {}) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) throw new Error("Missing Cloudinary upload configuration.");
  const formData = new FormData();
  formData.set("file", blob);
  formData.set("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.set("folder", options.folder || "stalltalk/content-ads");
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}/image/upload`, { method: "POST", body: formData });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.secure_url) throw new Error(data.error?.message || "Cloudinary upload failed.");
  return data.secure_url;
}

window.StallTalkCloudinaryUpload = { uploadAdBlob };
