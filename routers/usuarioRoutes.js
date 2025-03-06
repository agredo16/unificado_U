const express = require('express');
const router = express.Router();
const { verificarPermisos } = require('../middlewares/middleware');

module.exports = (autenticarMiddleware, usuarioModel) => {
  const UsuarioController = require('../controllers/usuarioController');
  const controller = new UsuarioController(usuarioModel);

  router.post('/registro', autenticarMiddleware, (req, res, next) => {
    const totalUsuarios = usuarioModel.contarUsuarios(); // Corregido
    if (totalUsuarios === 0) {
      return controller.registrar(req, res);
    } else {
      return verificarPermisos(['crear_usuarios'])(req, res, next);
    }
  }, controller.registrar.bind(controller));

  router.post('/login', controller.login.bind(controller));
  router.get('/', autenticarMiddleware, verificarPermisos(['ver_usuarios']), controller.obtenerTodos.bind(controller));
  router.get('/:id', autenticarMiddleware, verificarPermisos(['ver_usuarios']), controller.obtenerPorId.bind(controller));
  router.put('/:id', autenticarMiddleware, verificarPermisos(['editar_usuarios']), controller.actualizar.bind(controller));
  router.delete('/:id', autenticarMiddleware, verificarPermisos(['eliminar_usuarios']), controller.eliminar.bind(controller));

  router.get('/roles/todos', autenticarMiddleware, verificarPermisos(['configuracion_sistema']), controller.obtenerRoles.bind(controller));
  router.post('/roles', autenticarMiddleware, verificarPermisos(['configuracion_sistema']), controller.crearRol.bind(controller));
  router.put('/roles/:nombre', autenticarMiddleware, verificarPermisos(['configuracion_sistema']), controller.actualizarRol.bind(controller));

  router.post('/acciones/registrar', autenticarMiddleware, verificarPermisos(['configuracion_sistema']), controller.registrarAccionSuperAdmin.bind(controller));

  return router;
};