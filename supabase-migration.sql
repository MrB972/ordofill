-- ============================================
-- OrdoFill — Tables Supabase
-- À coller dans Lovable (chat agent IA)
-- ============================================

-- Profils infirmiers OrdoFill
CREATE TABLE IF NOT EXISTS ordofill_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  cabinet_name text,
  cabinet_address text,
  numero_rpps text,
  numero_adeli text,
  signature_url text,
  onboarding_completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Patients OrdoFill
CREATE TABLE IF NOT EXISTS ordofill_patients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES ordofill_profiles(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  gender text,
  address text,
  city text,
  postal_code text,
  numero_securite_sociale text,
  medecin_traitant text,
  phone text,
  email text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Templates de formulaires
CREATE TABLE IF NOT EXISTS ordofill_form_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES ordofill_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  original_file_url text,
  thumbnail_url text,
  detected_fields jsonb,
  field_mappings jsonb,
  category text NOT NULL DEFAULT 'Autre',
  is_public boolean DEFAULT false,
  upload_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Formulaires remplis
CREATE TABLE IF NOT EXISTS ordofill_filled_forms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES ordofill_profiles(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES ordofill_form_templates(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES ordofill_patients(id) ON DELETE CASCADE,
  filled_data jsonb,
  status text NOT NULL DEFAULT 'draft',
  generated_pdf_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Suggestions intelligentes
CREATE TABLE IF NOT EXISTS ordofill_smart_suggestions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES ordofill_profiles(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES ordofill_form_templates(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  suggested_value text NOT NULL,
  frequency integer DEFAULT 1,
  last_used_at timestamp with time zone DEFAULT now()
);

-- Activer RLS (Row Level Security) en mode public pour la démo
ALTER TABLE ordofill_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordofill_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordofill_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordofill_filled_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordofill_smart_suggestions ENABLE ROW LEVEL SECURITY;

-- Policies RLS : accès public (pour la démo)
CREATE POLICY "Allow all on ordofill_profiles" ON ordofill_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ordofill_patients" ON ordofill_patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ordofill_form_templates" ON ordofill_form_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ordofill_filled_forms" ON ordofill_filled_forms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on ordofill_smart_suggestions" ON ordofill_smart_suggestions FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Données de démo
-- ============================================

-- Profil Marie Dupont
INSERT INTO ordofill_profiles (id, full_name, email, phone, cabinet_name, cabinet_address, numero_rpps, numero_adeli, onboarding_completed)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Marie Dupont',
  'marie@cabinet-dupont.fr',
  '06 12 34 56 78',
  'Cabinet Infirmier Dupont',
  '15 Rue de la Santé, 75013 Paris',
  '12345678901',
  '123456789',
  true
);

-- Patients
INSERT INTO ordofill_patients (id, user_id, first_name, last_name, date_of_birth, gender, address, city, postal_code, numero_securite_sociale, medecin_traitant, phone, email, notes) VALUES
('b1000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Jean', 'Martin', '1985-03-15', 'M', '12 Rue de Rivoli', 'Paris', '75001', '1 85 03 75 123 456 78', 'Dr. Bernard', '06 11 22 33 44', 'jean.martin@email.fr', NULL),
('b1000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sophie', 'Leclerc', '1972-07-22', 'F', '8 Avenue des Champs-Elysees', 'Paris', '75008', '2 72 07 75 234 567 89', 'Dr. Moreau', '06 22 33 44 55', 'sophie.leclerc@email.fr', 'Allergie penicilline'),
('b1000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Pierre', 'Dubois', '1990-11-08', 'M', '45 Boulevard Saint-Germain', 'Paris', '75005', '1 90 11 75 345 678 90', 'Dr. Petit', '06 33 44 55 66', 'pierre.dubois@email.fr', NULL),
('b1000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Isabelle', 'Moreau', '1968-01-30', 'F', '23 Rue du Faubourg Saint-Antoine', 'Paris', '75011', '2 68 01 75 456 789 01', 'Dr. Leroy', '06 44 55 66 77', 'isabelle.moreau@email.fr', 'Diabete type 2'),
('b1000001-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Lucas', 'Roux', '1995-06-12', 'M', '7 Place de la Bastille', 'Paris', '75004', '1 95 06 75 567 890 12', 'Dr. Simon', '06 55 66 77 88', 'lucas.roux@email.fr', NULL);

-- Templates de formulaires
INSERT INTO ordofill_form_templates (id, user_id, name, description, category, upload_count, detected_fields) VALUES
('c1000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Feuille de soins CPAM', 'Formulaire standard de feuille de soins pour remboursement CPAM', 'CPAM', 24, '[{"name":"nom_patient","type":"text","label":"Nom du patient","x":50,"y":120,"width":200,"height":30,"page":0},{"name":"prenom_patient","type":"text","label":"Prenom du patient","x":260,"y":120,"width":200,"height":30,"page":0},{"name":"numero_secu","type":"text","label":"N° Securite Sociale","x":50,"y":170,"width":300,"height":30,"page":0},{"name":"date_soins","type":"date","label":"Date des soins","x":50,"y":220,"width":150,"height":30,"page":0},{"name":"code_acte","type":"text","label":"Code acte","x":50,"y":270,"width":100,"height":30,"page":0},{"name":"montant","type":"number","label":"Montant","x":200,"y":270,"width":100,"height":30,"page":0},{"name":"signature_praticien","type":"signature","label":"Signature du praticien","x":50,"y":350,"width":200,"height":60,"page":0}]'),
('c1000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Demande d''entente prealable', 'Formulaire de demande d''entente prealable pour actes speciaux', 'Mutuelle', 12, '[{"name":"nom_assure","type":"text","label":"Nom de l''assure","x":50,"y":100,"width":200,"height":30,"page":0},{"name":"prenom_assure","type":"text","label":"Prenom de l''assure","x":260,"y":100,"width":200,"height":30,"page":0},{"name":"numero_adherent","type":"text","label":"N° Adherent","x":50,"y":150,"width":250,"height":30,"page":0},{"name":"date_demande","type":"date","label":"Date de la demande","x":50,"y":200,"width":150,"height":30,"page":0},{"name":"motif","type":"text","label":"Motif de la demande","x":50,"y":250,"width":400,"height":60,"page":0},{"name":"accord_mutuelle","type":"checkbox","label":"Accord mutuelle","x":50,"y":330,"width":20,"height":20,"page":0},{"name":"signature_medecin","type":"signature","label":"Signature du medecin","x":50,"y":370,"width":200,"height":60,"page":0},{"name":"date_signature","type":"date","label":"Date de signature","x":270,"y":370,"width":150,"height":30,"page":0}]'),
('c1000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Ordonnance de soins infirmiers', 'Ordonnance pour prescription de soins infirmiers a domicile', 'Prescription', 36, '[{"name":"nom_patient","type":"text","label":"Nom du patient","x":50,"y":110,"width":200,"height":30,"page":0},{"name":"prenom_patient","type":"text","label":"Prenom du patient","x":260,"y":110,"width":200,"height":30,"page":0},{"name":"date_naissance","type":"date","label":"Date de naissance","x":50,"y":160,"width":150,"height":30,"page":0},{"name":"soins_prescrits","type":"text","label":"Soins prescrits","x":50,"y":210,"width":400,"height":80,"page":0},{"name":"frequence","type":"text","label":"Frequence","x":50,"y":310,"width":200,"height":30,"page":0},{"name":"duree_traitement","type":"text","label":"Duree du traitement","x":260,"y":310,"width":200,"height":30,"page":0},{"name":"signature_prescripteur","type":"signature","label":"Signature du prescripteur","x":50,"y":380,"width":200,"height":60,"page":0}]'),
('c1000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Bon de transport', 'Bon de transport sanitaire pour deplacement medical', 'Autre', 8, '[{"name":"nom_patient","type":"text","label":"Nom du patient","x":50,"y":100,"width":200,"height":30,"page":0},{"name":"prenom_patient","type":"text","label":"Prenom du patient","x":260,"y":100,"width":200,"height":30,"page":0},{"name":"adresse_depart","type":"text","label":"Adresse de depart","x":50,"y":150,"width":400,"height":30,"page":0},{"name":"adresse_arrivee","type":"text","label":"Adresse d''arrivee","x":50,"y":200,"width":400,"height":30,"page":0},{"name":"date_transport","type":"date","label":"Date du transport","x":50,"y":250,"width":150,"height":30,"page":0},{"name":"motif_transport","type":"text","label":"Motif du transport","x":50,"y":300,"width":400,"height":60,"page":0}]');

-- Formulaires remplis
INSERT INTO ordofill_filled_forms (id, user_id, template_id, patient_id, status, filled_data) VALUES
('d1000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000001', 'b1000001-0000-0000-0000-000000000001', 'completed', '{"nom_patient":"Martin","prenom_patient":"Jean","numero_secu":"1 85 03 75 123 456 78","date_soins":"2026-03-10","code_acte":"AMI 4","montant":"12.60"}'),
('d1000001-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000001', 'b1000001-0000-0000-0000-000000000002', 'completed', '{"nom_patient":"Leclerc","prenom_patient":"Sophie","numero_secu":"2 72 07 75 234 567 89","date_soins":"2026-03-11","code_acte":"AMI 3","montant":"9.45"}'),
('d1000001-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000002', 'b1000001-0000-0000-0000-000000000003', 'draft', '{"nom_assure":"Dubois","prenom_assure":"Pierre","numero_adherent":"ADH-2024-003"}'),
('d1000001-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000003', 'b1000001-0000-0000-0000-000000000001', 'completed', '{"nom_patient":"Martin","prenom_patient":"Jean","date_naissance":"1985-03-15","soins_prescrits":"Injection insuline quotidienne","frequence":"1x/jour","duree_traitement":"3 mois"}'),
('d1000001-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000003', 'b1000001-0000-0000-0000-000000000004', 'downloaded', '{"nom_patient":"Moreau","prenom_patient":"Isabelle","date_naissance":"1968-01-30","soins_prescrits":"Pansement plaie chronique","frequence":"3x/semaine","duree_traitement":"6 semaines"}'),
('d1000001-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000004', 'b1000001-0000-0000-0000-000000000005', 'completed', '{"nom_patient":"Roux","prenom_patient":"Lucas","adresse_depart":"7 Place de la Bastille, 75004 Paris","adresse_arrivee":"Hopital Saint-Antoine, 75012 Paris","date_transport":"2026-03-12","motif_transport":"Consultation specialiste"}'),
('d1000001-0000-0000-0000-000000000007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000001', 'b1000001-0000-0000-0000-000000000004', 'draft', '{"nom_patient":"Moreau","prenom_patient":"Isabelle"}'),
('d1000001-0000-0000-0000-000000000008', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000002', 'b1000001-0000-0000-0000-000000000002', 'downloaded', '{"nom_assure":"Leclerc","prenom_assure":"Sophie","numero_adherent":"ADH-2024-008","date_demande":"2026-03-08","motif":"Soins infirmiers prolonges"}');

-- Suggestions intelligentes
INSERT INTO ordofill_smart_suggestions (user_id, template_id, field_name, suggested_value, frequency) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000001', 'code_acte', 'AMI 4', 15),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000001', 'code_acte', 'AMI 3', 8),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000003', 'frequence', '1x/jour', 10),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c1000001-0000-0000-0000-000000000003', 'frequence', '3x/semaine', 6);
