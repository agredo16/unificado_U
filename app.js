// app.js
const express = require('express');
const { connectDB } = require('./config/bdClient');
const usuarioRoutes = require('./routers/usuarioRoutes');
const Usuario = require('./models/Usuario');
const UsuarioController = require('./controllers/usuarioController');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const timeout = require('connect-timeout');
const {loggin, manejarErrores }= require('./middlewares/middleware');
const cors = require('cors');

require('dotenv').config();

const app = express();

// Middlewares
app.use(express.json());
app.use(helmet());
app.use(compression());
app.use(timeout('10s'));
app.use(cors());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100 
});
app.use(limiter);
app.use(loggin);

async function iniciarServidor() {
  const db = await connectDB();
  
  const usuarioModel = new Usuario(db);
  
  // Inicializar roles predeterminados
  await usuarioModel.inicializarRoles();
  
  const usuarioController = new UsuarioController(usuarioModel);
  
  // Rutas
  app.use('/api/usuarios', usuarioRoutes(usuarioController));
  
  // Manejador de errores
  app.use(manejarErrores);
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
}

iniciarServidor().catch(console.error);