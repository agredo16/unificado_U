require('dotenv').config();
console.log('JWT_SECRET:', process.env.JWT_SECRET);

const express = require('express');
const { connectDB } = require('./config/bdClient');
const usuarioRoutes = require('./routers/usuarioRoutes');
const Usuario = require('./models/Usuario');
const { autenticar } = require('./middlewares/middleware');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { loggin, manejarErrores } = require('./middlewares/middleware');
const cors = require('cors');


const app = express();

// Middlewares base
app.use(express.json());
app.use(helmet());
app.use(compression());
app.use(cors());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(loggin);

// Variable para almacenar la instancia del modelo
let usuarioModelInstance = null;

async function iniciarServidor() {
  try {
    // Conectar a la base de datos (singleton)
    const db = await connectDB();

    // Crear instancia del modelo y reutilizarla
    usuarioModelInstance = new Usuario(db);
    
    await usuarioModelInstance.inicializarRoles();

    const autenticarMiddleware = autenticar(usuarioModelInstance);

    // Configurar rutas
    app.use('/api/usuarios', usuarioRoutes(autenticarMiddleware, usuarioModelInstance));

    // Middleware de manejo de errores 
    app.use(manejarErrores);

    const PORT = process.env.PORT || 3000;
    
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Iniciar el servidor
iniciarServidor();