const jwt = require('jsonwebtoken');

// Middleware para autenticación
const autenticar = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Extrae el token del encabezado "Authorization"
    
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }
    
    // Decodifica el token JWT
    const decodificado = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
    
    // Agrega la información del usuario al objeto `req`
    req.usuario = decodificado;
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Middleware para verificación de permisos
const verificarPermisos = (permisosRequeridos) => {
  return (req, res, next) => {
    try {
      const { permisos } = req.usuario; 

      console.log('Permisos del usuario :', permisos);
      console.log('Permisos requeriods :', permisosRequeridos);
      
      
      
      if (!permisos || !Array.isArray(permisos)) {
        return res.status(403).json({ 
          error: 'No tiene los permisos necesarios para esta acción' 
        });
      }
      
   
      const tienePermiso = permisosRequeridos.some(permiso => 
        permisos.includes(permiso)
      );
      
      if (!tienePermiso) {
        return res.status(403).json({ 
          error: 'No tiene los permisos necesarios para esta acción' 
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };
};

// Middleware para validar datos de registro
const validarRegistro = (req, res, next) => {
  const { email, password, nombre, tipo } = req.body;
  
  // Validar que los campos necesarios estén presentes
  if (!email || !password || !nombre || !tipo) {
    return res.status(400).json({ 
      error: 'Faltan campos obligatorios (email, password, nombre, tipo)' 
    });
  }
  
  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Formato de email inválido' });
  }
  
  // Validar contraseña (mínimo 6 caracteres)
  if (password.length < 6) {
    return res.status(400).json({ 
      error: 'La contraseña debe tener al menos 6 caracteres' 
    });
  }
  
  // Validar tipo de usuario
  const tiposValidos = ['cliente', 'laboratorista', 'administrador', 'super_admin'];
  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de usuario no válido' });
  }
  
  next();
};

// Middleware para logging
const loggin = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  
  console.log(`[${timestamp}] ${method} ${url}`);
  
  // Registrar tiempo de respuesta
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${timestamp}] ${method} ${url} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
};

// Middleware para manejo centralizado de errores
const manejarErrores = (err, req, res, next) => {
  console.error('Error:', err.message);
  
  // Si el error es de timeout
  if (err.timeout) {
    return res.status(408).json({ error: 'Tiempo de espera agotado' });
  }
  
  // Si es un error de validación de MongoDB
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  
  // Si es un error de casting de MongoDB
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Formato de ID inválido' });
  }
  
  // Para cualquier otro error no manejado
  res.status(500).json({ error: 'Error interno del servidor' });
};

module.exports = {
  autenticar,
  verificarPermisos,
  validarRegistro,
  loggin,
  manejarErrores
};