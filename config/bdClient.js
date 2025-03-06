const {MongoClient} = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const connectDB = async ()=>{
    try{
        console.log('Conectando a la base de datos...');
        const start = Date.now();
        await client.connect();
        const duration = Date.now() - start;
        console.log(`Conexión a la base de datos exitosa. Tiempo: ${duration}ms`); 
         return client.db('RE_usuarios');     
    }catch (error){
        console.log('Error de conexion:', error);
        process.exit(1);
        
    }
};
module.exports ={connectDB};