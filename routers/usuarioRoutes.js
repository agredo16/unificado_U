require('dotenv').config();
const express = require('express');
const router = express.Router();
const { verificarPermisos } = require('../middlewares/middleware');

module.exports = (autenticarMiddleware, usuarioModel) => {
  const UsuarioController = require('../controllers/usuarioController');
  const controller = new UsuarioController(usuarioModel);

  router.post('/registro', autenticarMiddleware, async (req, res, next) => {
    try {
      const totalUsuarios = await usuarioModel.contarUsuarios(); 
      if (totalUsuarios === 0) {
        return controller.registrar(req, res);
      } else {
        return verificarPermisos(['crear_usuarios'])(req, res, next);
      }
    } catch (error) {
      next(error);
    }
  }, controller.registrar.bind(controller));

  router.post('/login', controller.login.bind(controller));
  router.get('/', controller.obtenerTodos.bind(controller));

  const rutasAutenticadas = [
    { path: '/', method: 'get', handler: controller.obtenerTodos, permisos: ['ver_usuarios'] },
    { path: '/:id', method: 'get', handler: controller.obtenerPorId, permisos: ['ver_usuarios'] },
    { path: '/:id', method: 'put', handler: controller.actualizar, permisos: ['editar_usuarios'] },
    { path: '/:id', method: 'delete', handler: controller.eliminar, permisos: ['eliminar_usuarios'] },
    { path: '/roles/todos', method: 'get', handler: controller.obtenerRoles, permisos: ['configuracion_sistema'] },
    { path: '/roles', method: 'post', handler: controller.crearRol, permisos: ['configuracion_sistema'] },
    { path: '/roles/:nombre', method: 'put', handler: controller.actualizarRol, permisos: ['configuracion_sistema'] },
    { path: '/acciones/registrar', method: 'post', handler: controller.registrarAccionSuperAdmin, permisos: ['configuracion_sistema'] }
  ];

  rutasAutenticadas.forEach(ruta => {
    router[ruta.method](
      ruta.path, 
      autenticarMiddleware, 
      verificarPermisos(ruta.permisos), 
      ruta.handler.bind(controller)
    );
  });

  return router;
};