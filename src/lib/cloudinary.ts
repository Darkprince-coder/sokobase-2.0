// Only images hosted in this project's own Cloudinary account are accepted anywhere an image URL
// is saved, so stored URLs can't point at arbitrary hosts (next/image would also refuse them).
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

export const isOwnImageUrl = (url: string) =>
  !!CLOUD && url.length <= 500 && url.startsWith(`https://res.cloudinary.com/${CLOUD}/image/upload/`);
