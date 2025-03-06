const express = require('express');
const router = express.Router();
const { autenticar, verificarPermisos } = require('../middlewares/middleware');
const Usuario = require('../models/Usuario'); 

module.exports = (controller) => {
    router.post('/registro', autenticar, (req, res,next)=>{
        const totalUsuarios = UsuarioModel.cotarUsuarios();
        if(totalUsuarios === 0){
            return controller.registrar(req, res);
        }else {
            return verificarPermisos(['crear_usuarios'])(req, res, next);
        }
    },controller.registrar.bind(controller));
    
    router.post('/login', controller.login.bind(controller));
    router.get('/', autenticar, verificarPermisos(['ver_usuarios']), controller.obtenerTodos.bind(controller));
    router.get('/:id', autenticar, verificarPermisos(['ver_usuarios']), controller.obtenerPorId.bind(controller));
    router.put('/:id', autenticar, verificarPermisos(['editar_usuarios']), controller.actualizar.bind(controller));
    router.delete('/:id', autenticar, verificarPermisos(['eliminar_usuarios']), controller.eliminar.bind(controller));

    router.get('/roles/todos', autenticar, verificarPermisos(['configuracion_sistema']), controller.obtenerRoles.bind(controller));
    router.post('/roles', autenticar, verificarPermisos(['configuracion_sistema']), controller.crearRol.bind(controller));
    router.put('/roles/:nombre', autenticar, verificarPermisos(['configuracion_sistema']), controller.actualizarRol.bind(controller));


    router.post('/acciones/registrar', autenticar, verificarPermisos(['configuracion_sistema']), controller.registrarAccionSuperAdmin.bind(controller));

    return router;
};
