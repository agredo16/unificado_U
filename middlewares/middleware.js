const jwt = require('jsonwebtoken');
require('dotenv').config();

let hayUsuariosRegistrados = null;
let ultimaComprobacion = 0;
const INTERVALO_COMPROBACION = 60000; // 1 minuto en milisegundos

const autenticar = (usuarioModel) => async (req, res, next) => {
  try {
    const ahora = Date.now();
    
    // Solo verificar si hay usuarios cada minuto o en la primera ejecución
    if (hayUsuariosRegistrados === null || (ahora - ultimaComprobacion) > INTERVALO_COMPROBACION) {
      console.log('Middleware autenticar: Verificando si hay usuarios registrados...');
      const totalUsuarios = await usuarioModel.contarUsuarios();
      hayUsuariosRegistrados = totalUsuarios > 0;
      ultimaComprobacion = ahora;
    }

    if (!hayUsuariosRegistrados) {
      console.log('Middleware autenticar: No hay usuarios registrados. Permitir registro sin autenticación.');
      return next();
    }

    console.log('Middleware autenticar: Hay usuarios registrados. Verificando token...');
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      console.log('Middleware autenticar: Token no proporcionado.');
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET no está definido en las variables de entorno');
    }

    const decodificado = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decodificado;
    next();
  } catch (error) {
    console.error('Middleware autenticar: Error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'El token ha expirado' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    return res.status(401).json({ error: 'Error en la autenticación' });
  }
};

const verificarPermisos = (permisosRequeridos = []) => {
  return async (req, res, next) => {
    try {
      // No hacemos la consulta de contarUsuarios aquí, usamos el valor cacheado
      if (!hayUsuariosRegistrados) {
        return next();
      }

      const usuarioActual = req.usuario;

      if (!usuarioActual) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const permisos = usuarioActual.permisos || (usuarioActual.rol && usuarioActual.rol.permisos) || [];

      console.log('Permisos del usuario:', permisos);
      console.log('Permisos requeridos:', permisosRequeridos);

      if (!permisos || !Array.isArray(permisos)) {
        return res.status(403).json({ error: 'No tiene permisos asignados' });
      }

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