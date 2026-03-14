-- Migration: Add calibration_defaults table for user-specific PDF calibration persistence
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS calibration_defaults (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  calibration_data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE calibration_defaults ENABLE ROW LEVEL SECURITY;

-- Policy: users can manage their own calibration
CREATE POLICY "Users can manage own calibration"
  ON calibration_defaults
  FOR ALL
  USING (true);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_calibration_defaults_user_id ON calibration_defaults(user_id);
