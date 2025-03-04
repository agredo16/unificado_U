const { ObjectId } = require("mongodb");

class Usuario{
    constructor(db){
        this.collection = db.collection('usuarios');
        this.rolesCollection = db.collection('roles')
    }

    async inicializarRoles(){
        const rolesExistentes = await this.rolesCollection.countDocuments();
        if(rolesExistentes === 0){

            await this.rolesCollection.insertMany([
                {nombre : 'cliente',
                    permisos : ['perfil_propio']
                },
                {nombre : 'laboratorista',
                    permisos : ['perfil_propio', 'gestionar_pruebas','ver_resultados']
                },
                {nombre: 'administrador',
                    permisos: ['perfil_propio','ver_usuarios','editar_usuarios','gestionar_laboratoristas']
                },
                {nombre: 'super_admin',
                    permisos: ['perfil_propio','ver_usuarios','editar_usuarios','crear_admin','eliminar_admi','configuracion_sistema']
                }
            ]);
            console.log('Roles inicializados correctamente');
            
        }
    }

    async crear(userData){
        const rol = await this.rolesCollection.findOne({nombre: userData.tipo});
        if(!rol){
            throw new Error('Tipo de ususraio no valido')
        }

        if (userData.tipo === 'super_admin'){
            const superAdminExistente = await this.collection.findOne({ 'rol.nombre': 'super_admin'})
            if ( superAdminExistente){
                throw new Error('ya existe un Super administrador');
            }
        }

        const nuevoUsuario ={
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

        switch (userData.tipo){
            case 'cliente':
                nuevoUsuario.detalles ={
                    historialSolicitudes: [],
                    ...userData.datosEspecificos
                };
                break;
                case 'laboratorista':
                    nuevoUsuario.detalles ={
                        especialidad: userData.datosEspecificos?.especialidad || '',
                        ...userData.datosEspecificos
                    };
                    break;
                    case 'administrador':
                        nuevoUsuario.detalles ={
                            nivelAcceso: userData.datosEspecificos?.nivelAcceso || 1,
                            ...userData.datosEspecificos
                        };
                        break;
                        case 'super_admin':
                            nuevoUsuario.detalles ={
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

    async obtenerPorId(id){
      if(!ObjectId.isValid(id)){
        throw new Error('ID no válido');
      }
        return await this.collection.findOne({ _id: new ObjectId(id)});
    }

    async obtenerPorEmail(email){
        return await this.collection.findOne({ email});
    }

    async actualizarUsuario(id, datosActualizados) {
      if (!ObjectId.isValid(id)){
        throw new Error('ID no válido');
      }

        if (datosActualizados.tipo) {
          const rol = await this.rolesCollection.findOne({ nombre: datosActualizados.tipo });
          if (!rol) {
            throw new Error('Tipo de usuario no válido');
          }
          
          if (datosActualizados.tipo === 'super_admin') {
            const superAdminExistente = await this.collection.findOne({ 
              'rol.nombre': 'super_admin',
              _id: { $ne: ObjectIdbjectId }
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
          const usuario = await this.obtenerPorId(id);
          datosActualizados.detalles = {
            ...usuario.detalles,
            ...datosActualizados.datosEspecificos
          };
          
          delete datosActualizados.datosEspecificos;
        }

        // Actualizamos el usuario en la base de datos
  const resultado = await this.collection.updateOne(
    { _id: objectId }, 
    { $set: datosActualizados }
  );
    
        return await this.collection.updateOne(
          { _id: id },
          { $set: datosActualizados }
        );
      }
    
      async eliminar(id) {
        return await this.collection.deleteOne({ _id: id });
      }
    
      // Métodos adicionales para gestionar roles
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
        return await this.collection.updateOne(
          { _id: userId, 'rol.nombre': 'super_admin' },
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