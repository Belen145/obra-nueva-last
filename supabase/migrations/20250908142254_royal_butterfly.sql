/*
  # Add updated_at column to documents table

  1. New Columns
    - `updated_at` (timestamptz, auto-updated)
  
  2. Database Features
    - Automatic timestamp update on row modification
    - Default value set to current timestamp
*/

DO $$
BEGIN
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE documents ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;