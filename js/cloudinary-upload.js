const env = import.meta.env || {};
const runtimeConfig = typeof window !== "undefined" ? window : {};

export const CLOUDINARY_CLOUD_NAME = env.VITE_CLOUDINARY_CLOUD_NAME || runtimeConfig.STALLTALK_CLOUDINARY_CLOUD_NAME || "ddp2yv3k3";
export const CLOUDINARY_UPLOAD_PRESET = env.VITE_CLOUDINARY_UPLOAD_PRESET || runtimeConfig.STALLTALK_CLOUDINARY_UPLOAD_PRESET || "stalltalk_ads";

export async function uploadAdToCloudinary(blob, campaignName = "stalltalk-ad") {
  const form = new FormData();
  form.append("file", blob, `${campaignName}.png`);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  form.append("folder", "stalltalk/ads");

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.secure_url) {
    throw new Error(data.error?.message || "Cloudinary upload failed.");
  }

  return data;
}

export async function resizeImageToSlot(source, slot) {
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  canvas.width = slot.width;
  canvas.height = slot.height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, slot.width, slot.height);

  const scale = Math.max(slot.width / image.naturalWidth, slot.height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, (slot.width - drawWidth) / 2, (slot.height - drawHeight) / 2, drawWidth, drawHeight);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve({ blob, canvas }) : reject(new Error("Unable to export resized ad.")), "image/png"));
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load generated ad image for resizing."));
    image.src = source;
  });
}
