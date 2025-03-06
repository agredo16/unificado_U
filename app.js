const express = require('express');
const { connectDB } = require('./config/bdClient');
const usuarioRoutes = require('./routers/usuarioRoutes');
const Usuario = require('./models/Usuario');
const{autenticar} = require('./middlewares/middleware');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const timeout = require('connect-timeout');
const {loggin, manejarErrores}= require('./middlewares/middleware');
const cors = require('cors');
const UsuarioController = require('./controllers/usuarioController');

require('dotenv').config();

const app = express();

app.use(express.json());
app.use(helmet());
app.use(compression());
app.use(timeout('30s'));
app.use(cors());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100 
});
app.use(limiter);
app.use(loggin);

async function iniciarServidor() {
  const db = await connectDB();

  const usuarioModel = new Usuario(db); // Define usuarioModel primero
  await usuarioModel.inicializarRoles();

  const autenticarMiddleware = autenticar(usuarioModel); // Ahora puedes crear el middleware

  const usuarioController = new UsuarioController(usuarioModel);

  app.use('/api/usuarios', usuarioRoutes(autenticarMiddleware, usuarioModel)); // Pasa autenticarMiddleware y usuarioModel

  app.use(manejarErrores);

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
}

iniciarServidor().catch(console.error);