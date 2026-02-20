import { pool } from './db';

export type AdImageStatus = 'processing' | 'success' | 'failed';

export interface CreateAdImageInput {
  id: string;
  sellerId: string;
  prompt: string;
  negativePrompt?: string;
  taskId: string;
  templateId: string;
}

export async function ensureAdImagesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ad_images (
      id VARCHAR(255) PRIMARY KEY,
      seller_id VARCHAR(255) NOT NULL,
      prompt TEXT NOT NULL,
      negative_prompt TEXT,
      task_id VARCHAR(255) UNIQUE,
      template_id VARCHAR(255),
      status VARCHAR(20) NOT NULL DEFAULT 'processing',
      result_url TEXT,
      cloudinary_url TEXT,
      cloudinary_public_id VARCHAR(255),
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_ad_image_seller FOREIGN KEY (seller_id) REFERENCES "user"(id) ON DELETE CASCADE
    );
  `);

  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_ad_images_seller_created ON ad_images (seller_id, created_at DESC);`
  );
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_ad_images_task ON ad_images (task_id);`);
}

export async function createAdImage(input: CreateAdImageInput) {
  const result = await pool.query(
    `INSERT INTO ad_images (
      id,
      seller_id,
      prompt,
      negative_prompt,
      task_id,
      template_id,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'processing')
    RETURNING *`,
    [
      input.id,
      input.sellerId,
      input.prompt,
      input.negativePrompt || null,
      input.taskId,
      input.templateId,
    ]
  );

  return result.rows[0];
}

export async function getAdImageByTaskId(taskId: string) {
  const result = await pool.query(`SELECT * FROM ad_images WHERE task_id = $1 LIMIT 1`, [taskId]);
  return result.rows[0] || null;
}

export async function updateAdImageSuccess(params: {
  taskId: string;
  resultUrl: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
}) {
  const result = await pool.query(
    `UPDATE ad_images
      SET status = 'success',
          result_url = $2,
          cloudinary_url = $3,
          cloudinary_public_id = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE task_id = $1
      RETURNING *`,
    [params.taskId, params.resultUrl, params.cloudinaryUrl, params.cloudinaryPublicId]
  );

  return result.rows[0] || null;
}

export async function updateAdImageFailed(taskId: string, errorMessage: string) {
  const result = await pool.query(
    `UPDATE ad_images
      SET status = 'failed',
          error_message = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE task_id = $1
      RETURNING *`,
    [taskId, errorMessage]
  );

  return result.rows[0] || null;
}

export async function getAdImagesBySeller(sellerId: string) {
  const result = await pool.query(
    `SELECT * FROM ad_images
    WHERE seller_id = $1
    ORDER BY created_at DESC`,
    [sellerId]
  );

  return result.rows;
}

export async function deleteAdImage(adImageId: string) {
  const result = await pool.query(`DELETE FROM ad_images WHERE id = $1 RETURNING *`, [adImageId]);

  return result.rows[0] || null;
}
