const {MongoClient} = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

const connectDB = async ()=>{
    try{
        await client.connect();
        console.log('Conectado a mongodb atlas');
        return client.db('RE_usuarios');     
    }catch (error){
        console.log('Error de conexion:', error);
        process.exit(1);
        
    }
};
module.exports ={connectDB};