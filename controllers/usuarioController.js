const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class UsuarioController {
    constructor(usuarioModel) {
        this.usuarioModel = usuarioModel;
    }

    async registrar(req, res) {
        try {
            const usuarioActual = req.usuario; // Suponiendo que el usuario actual está en el request

            // Obtener permisos de manera flexible
            const permisos = usuarioActual.permisos || (usuarioActual.rol && usuarioActual.rol.permisos) || [];

            // Verifica si el usuario que realiza la acción tiene el permiso 'crear_usuarios'
            if (!permisos.includes('crear_usuarios')) {
                return res.status(403).json({ error: 'No tiene permisos para crear usuarios' });
            }

            const { email, password, nombre, tipo, documento, telefono, direccion, ...datosEspecificos } = req.body;

            const existente = await this.usuarioModel.obtenerPorEmail(email);
            if (existente) {
                return res.status(400).json({ error: 'Email ya registrado' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const usuarioResult = await this.usuarioModel.crear({
                email,
                password: hashedPassword,
                nombre,
                tipo,
                documento,
                telefono,
                direccion,
                datosEspecificos
            });

            res.status(201).json({
                mensaje: 'Usuario creado exitosamente',
                usuario: {
                    _id: usuarioResult.insertedId,
                    email,
                    nombre,
                    tipo
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;

            const usuario = await this.usuarioModel.obtenerPorEmail(email);
            if (!usuario) {
                return res.status(400).json({ error: 'Credenciales inválidas' });
            }

            const contraseñaValida = await bcrypt.compare(password, usuario.password);
            if (!contraseñaValida) {
                return res.status(400).json({ error: 'Credenciales inválidas' });
            }

            // CORREGIDO: Estructura del token unificada
            const token = jwt.sign(
                {
                    userId: usuario._id,
                    rol: usuario.rol.nombre || 'sin_rol',
                    permisos: usuario.rol?.permisos || []
                },
                process.env.JWT_SECRET || 'secreto',
                { expiresIn: '1h' }
            );

            console.log('Token generado:', jwt.decode(token));

            res.status(200).json({
                mensaje: 'Login exitoso',
                token,
                usuario: {
                    _id: usuario._id,
                    nombre: usuario.nombre,
                    email: usuario.email,
                    rol: usuario.rol.nombre,
                    permisos: usuario.rol?.permisos || []
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async obtenerTodos(req, res) {
        try {
            const usuarios = await this.usuarioModel.obtenerTodos();
            res.status(200).json(usuarios);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async obtenerPorId(req, res) {
        try {
            const usuario = await this.usuarioModel.obtenerPorId(req.params.id);
            if (!usuario) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            // Eliminamos la contraseña antes de enviar al cliente
            const { password, ...usuarioSinPassword } = usuario;

            res.status(200).json(usuarioSinPassword);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async actualizar(req, res) {
        try {
            const usuarioActual = req.usuario; // Suponiendo que el usuario actual está en el request
            const { password, tipo, ...datosActualizados } = req.body;

            if (password) {
                datosActualizados.password = await bcrypt.hash(password, 10);
            }

            // Si se está cambiando el tipo de usuario
            if (tipo) {
                datosActualizados.tipo = tipo;
            }

            const resultado = await this.usuarioModel.actualizarUsuario(
                req.params.id,
                datosActualizados,
                usuarioActual // Pasar el usuario actual para verificar permisos
            );

            if (resultado.matchedCount === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            res.status(200).json({ mensaje: 'Usuario actualizado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async eliminar(req, res) {
        try {
            const usuarioActual = req.usuario; // Suponiendo que el usuario actual está en el request
            const resultado = await this.usuarioModel.eliminar(req.params.id, usuarioActual);

            if (resultado.deletedCount === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            res.status(200).json({ mensaje: 'Usuario eliminado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async obtenerRoles(req, res) {
        try {
            const roles = await this.usuarioModel.obtenerRoles();
            res.status(200).json(roles);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async crearRol(req, res) {
        try {
            const { nombre, permisos } = req.body;

            const resultado = await this.usuarioModel.crearRol({
                nombre,
                permisos
            });

            res.status(201).json({
                mensaje: 'Rol creado exitosamente',
                rol: {
                    _id: resultado.insertedId,
                    nombre,
                    permisos
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async actualizarRol(req, res) {
        try {
            const { permisos } = req.body;
            const nombre = req.params.nombre;

            const resultado = await this.usuarioModel.actualizarRol(nombre, permisos);

            if (resultado.matchedCount === 0) {
                return res.status(404).json({ error: 'Rol no encontrado' });
            }

            res.status(200).json({ mensaje: 'Rol actualizado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async registrarAccionSuperAdmin(req, res) {
        try {
            const { accion } = req.body;
            const userId = req.usuario.userId;

            // Verificar el rol usando la estructura correcta
            const esAdmin = req.usuario.rol === 'super_admin' || 
                          (req.usuario.rol && req.usuario.rol.nombre === 'super_admin');
                          
            if (!esAdmin) {
                return res.status(403).json({ error: 'Acción no permitida' });
            }

            await this.usuarioModel.registrarAccionSuperAdmin(userId, accion);

            res.status(200).json({ mensaje: 'Acción registrada correctamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = UsuarioController;