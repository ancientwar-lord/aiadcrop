import { pool } from './db';

export type StudioTrialStatus = 'processing' | 'success' | 'failed';

export interface CreateStudioTrialInput {
  id: string;
  sellerId: string;
  productId: string;
  personImageUrl: string;
  gender: 'female' | 'male';
  youcamFileId: string;
  taskId: string;
}

export async function ensureStudioTrialsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS studio_trials (
      id VARCHAR(255) PRIMARY KEY,
      seller_id VARCHAR(255) NOT NULL,
      product_id VARCHAR(255) NOT NULL,
      person_image_url TEXT NOT NULL,
      gender VARCHAR(10) NOT NULL,
      youcam_file_id VARCHAR(255),
      task_id VARCHAR(255) UNIQUE,
      status VARCHAR(20) NOT NULL DEFAULT 'processing',
      source_result_url TEXT,
      trial_image_url TEXT,
      trial_image_public_id VARCHAR(255),
      error_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_studio_trial_seller FOREIGN KEY (seller_id) REFERENCES "user"(id) ON DELETE CASCADE,
      CONSTRAINT fk_studio_trial_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);

  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_studio_trials_seller_created ON studio_trials (seller_id, created_at DESC);`
  );
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_studio_trials_task ON studio_trials (task_id);`);
}

export async function createStudioTrial(input: CreateStudioTrialInput) {
  const result = await pool.query(
    `INSERT INTO studio_trials (
      id,
      seller_id,
      product_id,
      person_image_url,
      gender,
      youcam_file_id,
      task_id,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing')
    RETURNING *`,
    [
      input.id,
      input.sellerId,
      input.productId,
      input.personImageUrl,
      input.gender,
      input.youcamFileId,
      input.taskId,
    ]
  );

  return result.rows[0];
}

export async function getStudioTrialByTaskId(taskId: string) {
  const result = await pool.query(
    `SELECT
      st.*,
      p.category AS product_category,
      p.name AS product_name,
      p.cloudinary_url AS product_image_url
    FROM studio_trials st
    JOIN products p ON p.id = st.product_id
    WHERE st.task_id = $1
    LIMIT 1`,
    [taskId]
  );
  return result.rows[0] || null;
}

export async function updateStudioTrialSuccess(params: {
  taskId: string;
  sourceResultUrl: string;
  trialImageUrl: string;
  trialImagePublicId: string;
}) {
  const result = await pool.query(
    `UPDATE studio_trials
      SET status = 'success',
          source_result_url = $2,
          trial_image_url = $3,
          trial_image_public_id = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE task_id = $1
      RETURNING *`,
    [params.taskId, params.sourceResultUrl, params.trialImageUrl, params.trialImagePublicId]
  );

  return result.rows[0] || null;
}

export async function updateStudioTrialFailed(taskId: string, errorMessage: string) {
  const result = await pool.query(
    `UPDATE studio_trials
      SET status = 'failed',
          error_message = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE task_id = $1
      RETURNING *`,
    [taskId, errorMessage]
  );

  return result.rows[0] || null;
}

export async function getStudioTrialsBySeller(sellerId: string) {
  const result = await pool.query(
    `SELECT
      st.*,
      p.name AS product_name,
      p.category AS product_category,
      p.cloudinary_url AS product_image_url
    FROM studio_trials st
    JOIN products p ON p.id = st.product_id
    WHERE st.seller_id = $1
    ORDER BY st.created_at DESC`,
    [sellerId]
  );

  return result.rows;
}
