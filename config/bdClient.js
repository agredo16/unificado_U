const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  // Optimizaciones para la conexión de MongoDB
  useUnifiedTopology: true,
  maxPoolSize: 10, // Número máximo de conexiones en el pool
  minPoolSize: 5,   // Mantener al menos 5 conexiones abiertas
  maxIdleTimeMS: 30000 // Tiempo máximo que una conexión puede estar inactiva (30 segundos)
});

let dbConnection = null;

const connectDB = async () => {
  try {
    // Si ya existe una conexión, la reutilizamos
    if (dbConnection) {
      console.log('Reutilizando conexión existente a MongoDB Atlas');
      return dbConnection;
    }
    
    // Crear una nueva conexión
    await client.connect();
    console.log('Conectado a MongoDB Atlas');
    
    dbConnection = client.db('RE_usuarios');
    
    // Manejador para cerrar la conexión al finalizar la aplicación
    process.on('SIGINT', async () => {
      await client.close();
      console.log('Conexión a MongoDB cerrada');
      process.exit(0);
    });
    
    return dbConnection;     
  } catch (error) {
    console.log('Error de conexión:', error);
    process.exit(1);
  }
};

module.exports = { connectDB };