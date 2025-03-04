// routes/usuarioRoutes.js
const express = require('express');
const router = express.Router();
const { autenticar, verificarPermisos, validarRegistro } = require('../middlewares/middleware');

module.exports = (controller) => {
  // Rutas de usuarios
  router.post('/registro', validarRegistro, controller.registrar.bind(controller));
  router.post('/login', controller.login.bind(controller));
  router.get('/', autenticar, verificarPermisos(['ver_usuarios']), controller.obtenerTodos.bind(controller)); 
  router.get('/:id', autenticar, controller.obtenerPorId.bind(controller));
  router.put('/:id', autenticar, controller.actualizar.bind(controller));
  router.delete('/:id', autenticar, verificarPermisos(['eliminar_admin']), controller.eliminar.bind(controller));

  // Rutas de roles
  router.get('/roles/todos', autenticar, verificarPermisos(['configuracion_sistema']), controller.obtenerRoles.bind(controller));
  router.post('/roles', autenticar, verificarPermisos(['configuracion_sistema']), controller.crearRol.bind(controller));
  router.put('/roles/:nombre', autenticar, verificarPermisos(['configuracion_sistema']), controller.actualizarRol.bind(controller));

  // Ruta para registrar acciones de superadmin
  router.post('/acciones/registrar', autenticar, verificarPermisos(['configuracion_sistema']), controller.registrarAccionSuperAdmin.bind(controller));

  return router;
};