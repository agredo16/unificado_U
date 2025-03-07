const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  maxPoolSize: 10,
  minPoolSize: 5,  
  maxIdleTimeMS: 30000 
});

let dbConnection = null;

const connectDB = async () => {
  try {
    if (dbConnection) {
      console.log('Reutilizando conexión existente a MongoDB Atlas');
      return dbConnection;
    }
    
    await client.connect();
    console.log('Conectado a MongoDB Atlas');
    
    dbConnection = client.db('RE_usuarios');
    
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