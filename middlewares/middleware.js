const jwt = require('jsonwebtoken');

// Middleware para autenticación
const autenticar = async (req, res, next) => {
  try {
    // Verificar si ya existe algún usuario en la base de datos
    const totalUsuarios = await usuarioModel.contarUsuarios();

    // Si no hay usuarios en la base de datos, permitir la solicitud sin autenticación
    if (totalUsuarios === 0) {
      return next();
    }

    // Si hay usuarios, verificar el token
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET no está definido en las variables de entorno');
    }

    const decodificado = jwt.verify(token, process.env.JWT_SECRET);

    req.usuario = decodificado;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'El token ha expirado' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    return res.status(401).json({ error: 'Error en la autenticación' });
  }
};

// Middleware para verificación de permisos - CORREGIDO
const verificarPermisos = (permisosRequeridos = []) => {
  return async (req, res, next) => {
    try {
      // Verificar si ya existe algún usuario en la base de datos
      const totalUsuarios = await usuarioModel.contarUsuarios();

      // Si no hay usuarios en la base de datos, permitir la solicitud sin verificar permisos
      if (totalUsuarios === 0) {
        return next();
      }

      // Si hay usuarios, verificar permisos
      const usuarioActual = req.usuario;

      if (!usuarioActual) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      // Obtener permisos ya sea de req.usuario.permisos o de req.usuario.rol.permisos
      const permisos = usuarioActual.permisos || (usuarioActual.rol && usuarioActual.rol.permisos) || [];

      console.log('Permisos del usuario:', permisos);
      console.log('Permisos requeridos:', permisosRequeridos);

      if (!permisos || !Array.isArray(permisos)) {
        return res.status(403).json({ error: 'No tiene permisos asignados' });
      }

      // Verificar si el usuario tiene al menos uno de los permisos requeridos
      const tienePermisos = permisosRequeridos.some(permiso => permisos.includes(permiso));

      if (permisosRequeridos.length === 0 || tienePermisos) {
        return next();
      }

      return res.status(403).json({ error: 'No tiene los permisos necesarios para esta acción' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };
};

// Middleware para validar datos de registro
const validarRegistro = (req, res, next) => {
  const { email, password, nombre, tipo } = req.body;

  if (!email || !password || !nombre || !tipo) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (email, password, nombre, tipo)' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Formato de email inválido' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const tiposValidos = ['cliente', 'laboratorista', 'administrador', 'super_admin'];
  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de usuario no válido' });
  }

  next();
};

// Middleware para logging
const loggin = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const { method, originalUrl } = req;
  const usuario = req.usuario ? `Usuario: ${req.usuario.id}` : 'Usuario no autenticado';

  console.log(`[${timestamp}] ${method} ${originalUrl} - ${usuario}`);

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${timestamp}] ${method} ${originalUrl} - ${res.statusCode} (${duration}ms)`);
  });

  next();
};

// Middleware para manejo de errores
const manejarErrores = (err, req, res, next) => {
  console.error('Error:', err.message);

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'El token ha expirado' });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Token inválido' });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Formato de ID inválido' });
  }

  res.status(500).json({ error: 'Error interno del servidor' });
};

module.exports = {
  autenticar,
  verificarPermisos,
  validarRegistro,
  loggin,
  manejarErrores
};