-- Ajouter le template Cerballiance dans OrdoFill
INSERT INTO ordofill_form_templates (
  id, user_id, name, description, category, is_public, upload_count, detected_fields, field_mappings
) VALUES (
  'c1000001-0000-0000-0000-000000000005',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Fiche de transmission Cerballiance',
  'Fiche de transmission de prelevements sanguins — MAR FO 023. V4. Formulaire officiel du reseau Cerballiance Martinique.',
  'Laboratoire',
  false,
  0,
  '[
    {"name":"nom_usuel","type":"text","label":"Nom usuel","x":30,"y":18,"width":25,"height":3,"page":0},
    {"name":"prenoms","type":"text","label":"Prenoms","x":58,"y":18,"width":25,"height":3,"page":0},
    {"name":"date_naissance","type":"date","label":"Date de naissance","x":30,"y":21,"width":15,"height":3,"page":0},
    {"name":"adresse","type":"text","label":"Adresse","x":30,"y":24,"width":50,"height":3,"page":0},
    {"name":"sexe","type":"checkbox","label":"Sexe H/F","x":82,"y":18,"width":10,"height":3,"page":0},
    {"name":"telephone","type":"text","label":"Telephone","x":82,"y":21,"width":15,"height":3,"page":0},
    {"name":"numero_secu","type":"text","label":"N° Securite Sociale","x":30,"y":27,"width":30,"height":3,"page":0},
    {"name":"medecin_traitant","type":"text","label":"Medecin traitant","x":55,"y":9,"width":25,"height":3,"page":0},
    {"name":"prescripteur","type":"text","label":"Prescripteur","x":30,"y":9,"width":25,"height":3,"page":0},
    {"name":"etablissement","type":"text","label":"Etablissement de soins","x":5,"y":9,"width":25,"height":3,"page":0}
  ]'::jsonb,
  '{"type":"cerballiance_labo","route":"/fiche-labo"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  detected_fields = EXCLUDED.detected_fields,
  field_mappings = EXCLUDED.field_mappings;
