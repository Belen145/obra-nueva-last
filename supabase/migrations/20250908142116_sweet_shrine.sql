/*
  # Add observations column to documents table

  1. Changes
    - Add `observations` column to `documents` table
    - Column type: text (nullable)
    - Used for internal team comments and tracking

  2. Purpose
    - Allow internal observations/comments on documents
    - Support incidence resolution workflow
    - Enable team collaboration and document tracking
*/

-- Add observations column to documents table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'observations'
  ) THEN
    ALTER TABLE documents ADD COLUMN observations text;
  END IF;
END $$;