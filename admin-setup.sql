-- Comando SQL para hacer administrador a un usuario específico
-- Ejecutar en el SQL Editor de Supabase

-- Reemplaza 'usuario@ejemplo.com' con el email del usuario que quieres hacer admin
UPDATE auth.users 
SET user_metadata = jsonb_set(
    COALESCE(user_metadata, '{}'),
    '{role}',
    '"admin"'
)
WHERE email = 'usuario@ejemplo.com';

-- Para verificar que se aplicó correctamente:
SELECT id, email, user_metadata->'role' as role
FROM auth.users
WHERE email = 'usuario@ejemplo.com';

-- Para quitar permisos de admin (opcional):
-- UPDATE auth.users 
-- SET user_metadata = user_metadata - 'role'
-- WHERE email = 'usuario@ejemplo.com';

-- Para ver todos los usuarios y sus roles:
-- SELECT id, email, user_metadata->'role' as role
-- FROM auth.users
-- ORDER BY created_at DESC;