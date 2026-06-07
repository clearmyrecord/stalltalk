export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed. Use POST."
    });
  }

  return res.status(501).json({
    ok: false,
    error: "Video ad generation route is scaffolded but not enabled yet.",
    message:
      "Image ad generation is active. Video generation can be connected here once the selected video model and storage workflow are finalized."
  });
}
