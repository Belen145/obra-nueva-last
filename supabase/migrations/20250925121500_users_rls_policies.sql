-- Políticas RLS para la tabla users
-- Permite que administradores creen y gestionen usuarios

-- Habilitar RLS en la tabla users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Política de SELECT: Usuarios autenticados pueden ver usuarios
CREATE POLICY "authenticated_users_can_select_users" 
ON users 
FOR SELECT 
TO authenticated 
USING (true);

-- Política de INSERT: Usuarios autenticados pueden crear usuarios
CREATE POLICY "authenticated_users_can_insert_users" 
ON users 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Política de UPDATE: Usuarios autenticados pueden actualizar usuarios
CREATE POLICY "authenticated_users_can_update_users" 
ON users 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Política de DELETE: Usuarios autenticados pueden eliminar usuarios
CREATE POLICY "authenticated_users_can_delete_users" 
ON users 
FOR DELETE 
TO authenticated 
USING (true);

-- Verificar que se crearon las políticas
SELECT 
  policyname, 
  cmd as operation,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY cmd, policyname;