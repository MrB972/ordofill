-- MIGRATION CORRECTIVE : calibration_defaults
-- 
-- Lovable a créé la table avec FK vers public.users(id) (Supabase Auth).
-- Or, OrdoFill n'utilise PAS Supabase Auth — l'auth est gérée via ordofill_profiles.
-- Le user_id qu'on stocke vient de ordofill_profiles.id, pas de auth.uid().
--
-- Cette migration :
-- 1. Supprime la FK vers users (qui bloquerait l'insert)
-- 2. Supprime les policies RLS basées sur auth.uid() (qui ne marche pas ici)
-- 3. Remet des policies permissives (le RLS est géré côté app)

-- Étape 1 : Supprimer la contrainte FK existante vers users
-- (le nom exact peut varier — Lovable l'a créée automatiquement)
DO $$
BEGIN
  -- Drop any FK constraint on user_id column
  PERFORM 1 FROM information_schema.table_constraints 
  WHERE table_name = 'calibration_defaults' 
  AND constraint_type = 'FOREIGN KEY';
  
  IF FOUND THEN
    -- Get and drop all FK constraints on this table
    EXECUTE (
      SELECT string_agg('ALTER TABLE calibration_defaults DROP CONSTRAINT ' || quote_ident(constraint_name), '; ')
      FROM information_schema.table_constraints
      WHERE table_name = 'calibration_defaults'
      AND constraint_type = 'FOREIGN KEY'
    );
  END IF;
END $$;

-- Étape 2 : Supprimer les policies RLS existantes (basées sur auth.uid())
DROP POLICY IF EXISTS "Users can manage own calibration" ON calibration_defaults;
DROP POLICY IF EXISTS "Users can select own calibration" ON calibration_defaults;
DROP POLICY IF EXISTS "Users can insert own calibration" ON calibration_defaults;
DROP POLICY IF EXISTS "Users can update own calibration" ON calibration_defaults;
DROP POLICY IF EXISTS "Users can delete own calibration" ON calibration_defaults;

-- Étape 3 : Recréer une policy permissive
-- (OrdoFill gère l'auth côté client, pas via Supabase Auth)
CREATE POLICY "Allow all access to calibration_defaults"
  ON calibration_defaults
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Vérifier que RLS est toujours activé
ALTER TABLE calibration_defaults ENABLE ROW LEVEL SECURITY;
