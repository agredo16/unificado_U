const { ObjectId } = require("mongodb");

class Usuario {
    constructor(db) {
        this.collection = db.collection('usuarios');
        this.rolesCollection = db.collection('roles');
    }
    async contarUsuarios() {
        return await this.collection.countDocuments();
    }

    async inicializarRoles() {
        const rolesExistentes = await this.rolesCollection.countDocuments();
        if (rolesExistentes === 0) {
            await this.rolesCollection.insertMany([
                {
                    nombre: 'cliente',
                    permisos: ['perfil_propio']
                },
                {
                    nombre: 'laboratorista',
                    permisos: [
                        'perfil_propio',
                        'gestionar_pruebas',
                        'ver_resultados',
                        'registro_muestras',
                        'editar_cliente'
                    ]
                },
                {
                    nombre: 'administrador',
                    permisos: [
                        'perfil_propio',
                        'ver_usuarios',
                        'editar_usuarios',
                        'gestionar_laboratoristas',
                        'eliminar_laboratoristas',
                        'eliminar_clientes',
                        'crear_laboratoristas',
                        'crear_clientes',
                        'registro_muestras'
                    ]
                },
                {
                    nombre: 'super_admin',
                    permisos: [
                        'perfil_propio',
                        'ver_usuarios',
                        'editar_usuarios',
                        'crear_usuarios',
                        'eliminar_usuarios',
                        'configuracion_sistema'
                    ]
                }
            ]);
            console.log('Roles inicializados correctamente');
        }
    }

    async crear(userData) {
        const rol = await this.rolesCollection.findOne({ nombre: userData.tipo });
        if (!rol) {
            throw new Error('Tipo de usuario no válido');
        }

        if (userData.tipo === 'super_admin') {
            const superAdminExistente = await this.collection.findOne({ 'rol.nombre': 'super_admin' });
            if (superAdminExistente) {
                throw new Error('Ya existe un Super administrador');
            }
        }

        const nuevoUsuario = {
            email: userData.email,
            password: userData.password,
            nombre: userData.nombre,
            documento: userData.documento,
            telefono: userData.telefono,
            direccion: userData.direccion,
            fechaCreacion: new Date(),
            activo: true,
            rol: {
                nombre: userData.tipo,
                permisos: rol.permisos
            },
            detalles: {}
        };

        switch (userData.tipo) {
            case 'cliente':
                nuevoUsuario.detalles = {
                    historialSolicitudes: [],
                    ...userData.datosEspecificos
                };
                break;
            case 'laboratorista':
                nuevoUsuario.detalles = {
                    especialidad: userData.datosEspecificos?.especialidad || '',
                    ...userData.datosEspecificos
                };
                break;
            case 'administrador':
                nuevoUsuario.detalles = {
                    nivelAcceso: userData.datosEspecificos?.nivelAcceso || 1,
                    ...userData.datosEspecificos
                };
                break;
            case 'super_admin':
                nuevoUsuario.detalles = {
                    codigoSeguridad: userData.datosEspecificos?.codigoSeguridad,
                    registroAcciones: [],
                    ...userData.datosEspecificos
                };
                break;
        }

        return await this.collection.insertOne(nuevoUsuario);
    }

    async obtenerTodos() {
        return await this.collection.find({}, { projection: { password: 0 } }).toArray();
    }

    async obtenerPorId(id) {
        if (!ObjectId.isValid(id)) {
            throw new Error('ID no válido');
        }
        return await this.collection.findOne({ _id: new ObjectId(id) });
    }

    async obtenerPorEmail(email) {
        return await this.collection.findOne({ email });
    }

    async actualizarUsuario(id, datosActualizados, usuarioActual) {
        if (!ObjectId.isValid(id)) {
            throw new Error('ID no válido');
        }

        const objectId = new ObjectId(id);

        const permisos = usuarioActual.permisos || (usuarioActual.rol && usuarioActual.rol.permisos) || [];

        if (!permisos.includes('editar_usuarios')) {
            throw new Error('No tiene permisos para editar usuarios');
        }

        const usuarioExistente = await this.obtenerPorId(id);
        if (!usuarioExistente) {
            throw new Error('Usuario no encontrado');
        }

        if (datosActualizados.tipo) {
            const rol = await this.rolesCollection.findOne({ nombre: datosActualizados.tipo });
            if (!rol) {
                throw new Error('Tipo de usuario no válido');
            }

            if (datosActualizados.tipo === 'super_admin') {
                const superAdminExistente = await this.collection.findOne({
                    'rol.nombre': 'super_admin',
                    _id: { $ne: objectId }
                });
                if (superAdminExistente) {
                    throw new Error('Ya existe un Super Administrador');
                }
            }

            datosActualizados.rol = {
                nombre: datosActualizados.tipo,
                permisos: rol.permisos
            };

            delete datosActualizados.tipo;
        }

        if (datosActualizados.datosEspecificos) {
            datosActualizados.detalles = {
                ...usuarioExistente.detalles,
                ...datosActualizados.datosEspecificos
            };

            delete datosActualizados.datosEspecificos;
        }

        const resultado = await this.collection.updateOne(
            { _id: objectId },
            { $set: datosActualizados }
        );

        if (resultado.matchedCount === 0) {
            throw new Error('Usuario no encontrado');
        }

        return resultado;
    }

    async eliminar(id, usuarioActual) {
        if (!ObjectId.isValid(id)) {
            throw new Error('ID no válido');
        }

        const objectId = new ObjectId(id);

        const usuarioExistente = await this.obtenerPorId(id);
        if (!usuarioExistente) {
            throw new Error('Usuario no encontrado');
        }

        const rolUsuarioAEliminar = usuarioExistente.rol.nombre;
        
        const permisos = usuarioActual.permisos || (usuarioActual.rol && usuarioActual.rol.permisos) || [];

        if (permisos.includes('eliminar_usuarios')) {
        } else if (rolUsuarioAEliminar === 'laboratorista' && permisos.includes('eliminar_laboratoristas')) {
        } else if (rolUsuarioAEliminar === 'cliente' && permisos.includes('eliminar_clientes')) {
        } else {
            throw new Error('No tienes permisos para eliminar este tipo de usuario');
        }

        const resultado = await this.collection.deleteOne({ _id: objectId });
        if (resultado.deletedCount === 0) {
            throw new Error('No se pudo eliminar el usuario');
        }

        return resultado;
    }

    async obtenerRoles() {
        return await this.rolesCollection.find({}).toArray();
    }

    async crearRol(rolData) {
        return await this.rolesCollection.insertOne(rolData);
    }

    async actualizarRol(nombre, permisos) {
        return await this.rolesCollection.updateOne(
            { nombre },
            { $set: { permisos } }
        );
    }

    async registrarAccionSuperAdmin(userId, accion) {
        if (!ObjectId.isValid(userId)) {
            throw new Error('ID de usuario no válido');
        }
        
        return await this.collection.updateOne(
            { _id: new ObjectId(userId), 'rol.nombre': 'super_admin' },
            {
                $push: {
                    'detalles.registroAcciones': {
                        accion,
                        fecha: new Date(),
                        detalles: `Acción realizada por super admin: ${accion}`
                    }
                }
            }
        );
    }
}

module.exports = Usuario;