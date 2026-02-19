/**
 * Cloudinary client utilities for image upload and management
 */

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image to Cloudinary from a buffer or file stream
 * @param file - File buffer or stream
 * @param options - Upload options (folder, public_id, etc.)
 */
export async function uploadToCloudinary(
  file: Buffer | NodeJS.ReadableStream,
  options: {
    folder?: string;
    public_id?: string;
    tags?: string[];
    resource_type?: 'image' | 'video' | 'auto' | 'raw';
  } = {}
) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'aiadcrop',
        resource_type: options.resource_type || 'auto',
        public_id: options.public_id,
        tags: options.tags,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    if (Buffer.isBuffer(file)) {
      uploadStream.end(file);
    } else {
      file.pipe(uploadStream);
    }
  });
}

/**
 * Get a secure URL for a Cloudinary resource
 */
export function getCloudinaryUrl(publicId: string) {
  return cloudinary.url(publicId, {
    secure: true,
  });
}

/**
 * Delete a resource from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
}

/**
 * Get metadata/info about a Cloudinary resource
 */
export async function getCloudinaryResourceInfo(publicId: string) {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    console.error('Error getting resource info:', error);
    throw error;
  }
}

const cloudinaryClient = {
  uploadToCloudinary,
  getCloudinaryUrl,
  deleteFromCloudinary,
  getCloudinaryResourceInfo,
};

export default cloudinaryClient;
