const express = require('express');
const router = express.Router();
const { autenticar, verificarPermisos } = require('../middlewares/middleware');
const Usuario = require('../models/Usuario'); 

module.exports = (controller) => {
    // Ruta de registro con validación de usuarios existentes
    router.post('/registro', controller.registrar.bind(controller));
    // Rutas de autenticación y usuarios
    router.post('/login', controller.login.bind(controller));
    router.get('/', autenticar, verificarPermisos(['ver_usuarios']), controller.obtenerTodos.bind(controller));
    router.get('/:id', autenticar, verificarPermisos(['ver_usuarios']), controller.obtenerPorId.bind(controller));
    router.put('/:id', autenticar, verificarPermisos(['editar_usuarios']), controller.actualizar.bind(controller));
    router.delete('/:id', autenticar, verificarPermisos(['eliminar_usuarios']), controller.eliminar.bind(controller));

    // Rutas de roles
    router.get('/roles/todos', autenticar, verificarPermisos(['configuracion_sistema']), controller.obtenerRoles.bind(controller));
    router.post('/roles', autenticar, verificarPermisos(['configuracion_sistema']), controller.crearRol.bind(controller));
    router.put('/roles/:nombre', autenticar, verificarPermisos(['configuracion_sistema']), controller.actualizarRol.bind(controller));

    // Ruta para registrar acciones de superadmin
    router.post('/acciones/registrar', autenticar, verificarPermisos(['configuracion_sistema']), controller.registrarAccionSuperAdmin.bind(controller));

    return router;
};
