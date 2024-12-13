import express from "express"; //Framework express
import cors from "cors"; //Para permitir o restringir las solicitudes HTTP realizadas desde un origen
import axios from "axios"; //Para hacer solicitudes HTTP
import session from "express-session";
import FileStoreFactory from "session-file-store";
import cookieParser from 'cookie-parser';
const FileStore = FileStoreFactory(session); // Crea la instancia del FileStore

// Creando una nueva aplicación Express.
const app = express();
app.use(cors());

//const URL_BASE = 'http://127.0.0.1:5000';
const URL_BASE = 'https://sistemadetecionincendiosappbackend-247193522958.us-central1.run.app';

// Usa cookie-parser para manejar cookies
app.use(cookieParser());
// Configurar middleware que analiza el cuerpo de las solicitudes JSON.
app.use(express.json()); // Para analizar JSON en el cuerpo de las solicitudes
app.use(express.urlencoded({ extended: true })); // Para analizar datos de formulario en el cuerpo de las solicitudes
// Para servir archivos estáticos.
app.use("/public", express.static("public"));

// Establecer EJS como el Motor de plantillas
app.set("view engine", "ejs");
app.set("views", "./views");

// Middleware para manejar datos enviados desde formularios (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));



//funcion para llamar a APIS externas
const callApi = async (url, request, token, method = 'POST') => {
  try {
      const options = {
          method: method,
          url: url,
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          },
          data: request // Se usará solo para métodos como POST, PUT, etc.
      };

      // Para métodos GET o DELETE, eliminamos `data` del objeto de configuración
      if (method === 'GET' || method === 'DELETE') {
          delete options.data;
      }

      const response = await axios(options);
      return response.data; // Devuelve solo el cuerpo de la respuesta
  } catch (error) {
      console.error('Error al llamar a la API:', error.message);
      throw error; // Relanzar el error para manejarlo fuera de la función
  }
};

app.get("/401", async (req, res) => {
  res.render("401")
});

app.get("/login/administrador", async (req, res) => {
  res.clearCookie('usuarioResponsable', {
    httpOnly: true, 
    secure: false, 
  });
  res.render("login")
});

app.post("/login/administrador", async (req, res) => 
{
  //obtenerRequest
  const { email_usuario, contrasenia_usuario } = req.body;
  const request = { email_usuario, contrasenia_usuario };
  //url
  const urlLoginAdministrador = URL_BASE + "/login/administrador"

  //primera llamada a la API
  callApi(urlLoginAdministrador, request, null, 'POST')
  .then(response => 
  {
    const usuario = response; // Asigna la respuesta a la variable
    
    res.cookie('usuario', JSON.stringify(usuario), 
    {
      maxAge: 1000 * 60 * 60 * 2, // La cookie expira en 2 horas
      httpOnly: true, // La cookie no es accesible desde JavaScript (más segura)
      secure: false, // Si usas HTTPS, cámbialo a true
    });

    res.clearCookie('usuarioResponsable', {
      httpOnly: true, // Igual que cuando se creó
      secure: false, // Igual que cuando se creó, ajusta según tu configuración (si usas HTTPS, pon true)
    });

    const exito = usuario.exito;
    if (exito) {
      const token = usuario.token;
      let urlObtenerValoresTotales = URL_BASE + "/registros_de_telemetria/obtener_valores_totales"

      callApi(urlObtenerValoresTotales, null, token, 'GET')
      .then(response => 
      {
          const valoresTotales = response; 
          res.render("dashboardAdministrador", {usuario, valoresTotales});
      })
      .catch(
        err =>
          {
            res.render("login", { credenciales_incorrectas: true });
          } 
      );
    }
    else {
      res.render("login", { credenciales_incorrectas: true });
    }
  })
  .catch(err => 
  {
      res.render("login", { credenciales_incorrectas: true });
  });
});

// Rutas protegidas: verifica si el usuario está autenticado
app.get("/dashboard/administrador", (req, res) => 
{

  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) 
  {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlObtenerValoresTotales = URL_BASE + "/registros_de_telemetria/obtener_valores_totales"

  callApi(urlObtenerValoresTotales, null, token, 'GET')
    .then(response => 
    {
      const valoresTotales = response;
      res.render("dashboardAdministrador", {usuario, valoresTotales});
    })
    .catch
    (
      err => 
      {
        res.render("login", { credenciales_incorrectas: true });
      }
    );
});


// USUARIOS
app.get("/mostrar/usuarios", (req, res) => 
{
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) 
  {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlObtenerUsuarios = URL_BASE + "/usuarios/obtener_usuarios"
  callApi(urlObtenerUsuarios, null, token, 'GET')
  .then(response => 
  {
      const usuarios = response.usuarios; // Asigna la respuesta a la variable
      res.render("mostrarUsuarios", {usuario, usuarios});
  })
  .catch(err => res.status(500).send("Error en el servidor "+err));
});

app.post("/formulario/usuario", async (req, res) => {
    // Acceder al id_usuario del cuerpo de la solicitud
    const { id_usuario } = req.body;

    const usuarioCookie = req.cookies['usuario'];
    if (!usuarioCookie) 
    {
      return res.redirect("/401"); // Redirige si no hay sesión
    }

    const usuario = JSON.parse(usuarioCookie);
    const token = usuario.token;
    let urlObtenerUsuario = URL_BASE + "/usuarios/obtener_usuario/id_usuario=" + id_usuario

    callApi(urlObtenerUsuario, null, token, 'GET')
    .then(response => 
    {
        const usuarioActializar = response.usuario; 
        return res.render("formularioEditarUsuario", {usuario, usuarioActializar});
    })
    .catch(err => res.status(500).send("Error en el servidor "+err));
});

app.post("/actualizar/usuario", async (req, res) => {
  // Acceder al id_usuario del cuerpo de la solicitud

  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) 
  {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  let { id_usuario, nombre_usuario, apaterno_usuario, amaterno_usuario, email_usuario, telefono_usuario, contrasenia_usuario } = req.body;
  
  id_usuario = Number(id_usuario[0]);


  let request = null;
  if (!contrasenia_usuario || contrasenia_usuario === "") 
  {
    request = { id_usuario, nombre_usuario, apaterno_usuario, amaterno_usuario, email_usuario, telefono_usuario }

  }
  else
  {
    request = { id_usuario, nombre_usuario, apaterno_usuario, amaterno_usuario, email_usuario, telefono_usuario, contrasenia_usuario }
  }

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlActualizarUsuario = URL_BASE + "/usuarios/actualizar_usuario" 

  callApi(urlActualizarUsuario, request, token, 'PUT')
  .then(response => 
  {
    let urlObtenerUsuarios = URL_BASE + "/usuarios/obtener_usuarios"
    callApi(urlObtenerUsuarios, null, token, 'GET')
    .then(response => 
    {
        const usuarios = response.usuarios; // Asigna la respuesta a la variable
        res.render("mostrarUsuarios", {usuario, usuarios, actualizacion_exitosa: true});
    })
    .catch(err => res.status(500).send("Error en el servidor "+err));
  
  })
  .catch(err => res.status(500).send("Error en el servidor "+err));
});


app.post("/eliminar/usuario", async (req, res) => {
  // Acceder al id_usuario del cuerpo de la solicitud

  
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) 
  {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  let { id_usuario } = req.body;
  id_usuario = String(id_usuario)

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlEliminarUsuario = URL_BASE + "/usuarios/eliminar_usuario/" + id_usuario

  callApi(urlEliminarUsuario, null, token, 'DELETE')
    .then(response => {

      if(response.mensaje === "el usuario que quiere eliminar esta asociada a un area")
      {
        let urlObtenerUsuarios = URL_BASE + "/usuarios/obtener_usuarios"
        callApi(urlObtenerUsuarios, null, token, 'GET')
          .then(response => {
            const usuarios = response.usuarios;  //Asigna la respuesta a la variable
            res.render("mostrarUsuarios", { usuario, usuarios, usuario_con_area: true });
          }).catch(err => res.status(500).send("Error en el servidor "+err));
      }
      else
      {
        let urlObtenerUsuarios = URL_BASE + "/usuarios/obtener_usuarios"
        callApi(urlObtenerUsuarios, null, token, 'GET')
          .then(response => {
            const usuarios = response.usuarios;  //Asigna la respuesta a la variable
            res.render("mostrarUsuarios", { usuario, usuarios, eliminacion_exitosa: true });
          }).catch(err => res.status(500).send("Error en el servidor "+err));
      }
    }).catch(err => res.status(500).send("Error en el servidor "+err));
});


app.get("/crear/usu", async (req, res) => 
{
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) 
  {
    return res.redirect("/401"); // Redirige si no hay sesión
  }
  const usuario = JSON.parse(usuarioCookie);
  res.render("crearUsuarioFormulario", {usuario})
});

app.post("/alta/usu", async (req, res) => {
  // Acceder al id_usuario del cuerpo de la solicitud

  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) 
  {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  let { nombre_usuario, apaterno_usuario, amaterno_usuario, email_usuario, telefono_usuario, contrasenia_usuario, id_rol } = req.body;
  
  id_rol = Number(id_rol[0]);

  const request = {nombre_usuario, apaterno_usuario, amaterno_usuario, email_usuario, telefono_usuario, contrasenia_usuario, id_rol }

  

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlAltaUsuario = URL_BASE + "/usuarios/crear_usuario" 

  callApi(urlAltaUsuario, request, token, 'POST')
  .then(response => 
  {

    res.render("crearUsuarioFormulario", {usuario, usuario_creado_exito: true})
  
  }).catch(err => res.status(500).send("Error en el servidor "+err));
});


// AREAS
app.get("/mostrar/areas", (req, res) => {
  const usuarioCookie = req.cookies['usuario'];
  
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  const urlObtenerAreas = URL_BASE + "/areas/obtener_areas";
  callApi(urlObtenerAreas, null, token, 'GET')
    .then(response => {
      const areas = response.areas; // Obtén la lista de áreas del API
      res.render("mostrarAreas", { usuario, areas });
    })
    .catch(err => {
      res.status(500).send("Error en el servidor");
    });
});

app.post("/formulario/area", async (req, res) => {
  // Verificar si el usuario está autenticado
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  // Obtener el id_area del cuerpo de la solicitud
  const { id_area } = req.body;

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;

  // Construir la URL para obtener el área
  let urlObtenerArea = URL_BASE + "/areas/obtener_area/id_area=" + id_area;

  callApi(urlObtenerArea, null, token, 'GET')
    .then(response => {
      const areaActualizar = response.area; // Obtener los datos del área de la respuesta
      return res.render("formularioEditarArea", { usuario, areaActualizar }); // Renderizar el formulario de edición
    })
    .catch(err => res.status(500).send("Error en el servidor"+err));
});

app.post("/actualizar/area", async (req, res) => {
  // Acceder al id_area del cuerpo de la solicitud
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  let { id_area, nombre_area } = req.body;

  // Convertir el id_area a número
  id_area = Number(id_area);

  // Crear el objeto de solicitud para actualizar el área
  const request = { id_area, nombre_area };

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlActualizarArea = URL_BASE + "/areas/actualizar_area";

  // Llamar a la API para actualizar el área
  callApi(urlActualizarArea, request, token, 'PUT')
    .then(response => {
      let urlObtenerAreas = URL_BASE + "/areas/obtener_areas";
      callApi(urlObtenerAreas, null, token, 'GET')
        .then(response => {
          const areas = response.areas; // Asigna la respuesta a la variable
          res.render("mostrarAreas", { usuario, areas, actualizacion_exitosa: true });
        })
        .catch(err => res.status(500).send("Error en el servidor"+err));
    })
    .catch(err => res.status(500).send("Error en el servidor"+err));
});

app.post("/eliminar/area", async (req, res) => {
  // Acceder al id_area del cuerpo de la solicitud
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  let { id_area } = req.body;
  id_area = String(id_area); // Convertir id_area a string si es necesario

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlEliminarArea = URL_BASE + "/areas/eliminar_area/id_area=" + id_area;



  const urlObtenerPrototipos = URL_BASE + "/prototipos/obtener_prototipos_por_area/id_area=" + id_area;

  callApi(urlObtenerPrototipos, null, token, 'GET')
  .then(response => {
      const prototipos = response.prototipos;

      // Verificar si prototipos es nulo, indefinido o vacío
      if (!prototipos || prototipos.length === 0) 
      {

        // Llamada a la API para eliminar el área
        callApi(urlEliminarArea, null, token, 'DELETE')
          .then(response => {
            if (response.mensaje === "el area que quiere eliminar esta asociada a un usuario") {
              let urlObtenerAreas = URL_BASE + "/areas/obtener_areas";
              callApi(urlObtenerAreas, null, token, 'GET')
                .then(response => {
                  const areas = response.areas;  // Asigna la respuesta a la variable
                  res.render("mostrarAreas", { usuario, areas, area_con_usuario: true });
                })
                .catch(err => res.status(500).send("Error en el servidor" + err));
            }
            else {
              let urlObtenerAreas = URL_BASE + "/areas/obtener_areas";
              callApi(urlObtenerAreas, null, token, 'GET')
                .then(response => {
                  const areas = response.areas;  // Asigna la respuesta a la variable
                  res.render("mostrarAreas", { usuario, areas, eliminacion_exitosa: true });
                })
                .catch(err => res.status(500).send("Error en el servidor" + err));
            }
          })
          .catch(err => res.status(500).send("Error en el servidor" + err));

      }
      else
      {

        let urlObtenerAreas = URL_BASE + "/areas/obtener_areas";
              callApi(urlObtenerAreas, null, token, 'GET')
                .then(response => {
                  const areas = response.areas;  // Asigna la respuesta a la variable
                  res.render("mostrarAreas", { usuario, areas, areas_con_proto: true });
                })
                .catch(err => res.status(500).send("Error en el servidor" + err));

      }
  })
  .catch(err => {
      console.error("Error al obtener los prototipos:", err);
      res.status(500).send("Error al obtener los prototipos.");
  });















});

app.get("/crear/area", async (req, res) => {
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }
  const usuario = JSON.parse(usuarioCookie);
  res.render("crearAreaFormulario", { usuario });
});

app.post("/alta/area", async (req, res) => {
  // Acceder al usuario de la sesión
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) 
  {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  // Obtener el nombre del área desde el cuerpo de la solicitud
  let { nombre_area } = req.body;

  // Preparar la solicitud
  const request = { nombre_area };

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlAltaArea = URL_BASE + "/areas/crear_area"; 

  // Realizar la llamada a la API para crear el área
  callApi(urlAltaArea, request, token, 'POST')
    .then(response => 
    {
      // Redirigir de vuelta al formulario con el mensaje de éxito
      res.render("crearAreaFormulario", { usuario, area_creada_exito: true });
    })
    .catch(err => res.status(500).send("Error en el servidor"+err));
});


// AREAS ADMINISTRADAS
// ÁREAS ADMINISTRADAS
app.get("/mostrar/areasAdministradas", (req, res) => {
  const usuarioCookie = req.cookies['usuario'];
  
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  const urlObtenerAreasAdministradas = URL_BASE + "/areas_administradas/obtener_areas_administradas";

  callApi(urlObtenerAreasAdministradas, null, token, 'GET')
    .then(response => {
      const areasAdministradas = response.areas; // Obtén la lista de áreas administradas del API
      res.render("mostrarAreasAdministradas", { usuario, areasAdministradas });
    })
    .catch(err => {
      res.status(500).send("Error en el servidor");
    });
});


app.post("/eliminar/areaAdministrada", async (req, res) => {
  // Acceder al id_area del cuerpo de la solicitud
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  let { id_area } = req.body;
  let { id_usuario } = req.body;
  id_area = parseInt(id_area); // Base 10
  id_usuario = parseInt(id_usuario);

  const request = {
    "id_area": id_area,
    "id_usuario": id_usuario
  }

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlEliminarArea = URL_BASE + "/areas_administradas/eliminar_area_administrada";

  // Llamada a la API para eliminar el área
  callApi(urlEliminarArea, request, token, 'POST')
    .then(response => {
      const urlObtenerAreasAdministradas = URL_BASE + "/areas_administradas/obtener_areas_administradas";

      callApi(urlObtenerAreasAdministradas, null, token, 'GET')
        .then(response => {
          const areasAdministradas = response.areas; // Obtén la lista de áreas administradas del API
          res.render("mostrarAreasAdministradas", { usuario, areasAdministradas, eliminacion_exitosa: true });
        })
        .catch(err => {
          res.status(500).send("Error en el servidor");
        });
    })
    .catch(err => res.status(500).send("Error en el servidor" + err));
});



app.get("/crear/areaAdministrada", async (req, res) => {
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }
  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;



  const urlObtenerUsuarios = URL_BASE + "/usuarios/obtener_usuarios"

  callApi(urlObtenerUsuarios, null, token, 'GET')
  .then(response => 
  {
      const usuarios = response.usuarios; // Asigna la respuesta a la variable
      const urlObtenerAreas = URL_BASE + "/areas/obtener_areas";

      callApi(urlObtenerAreas, null, token, 'GET')
        .then(response => {
          const areas = response.areas; // Obtén la lista de áreas del API
          res.render("crearAreasAdministradasFormulario", { usuario, areas, usuarios });
        })
        .catch(err => {
          res.status(500).send("Error en el servidor");
        });
  })

});



app.post("/alta/areaAdministrada", async (req, res) => {
  // Acceder al usuario de la sesión
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) 
  {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  // Obtener el nombre del área desde el cuerpo de la solicitud

  let { id_area } = req.body;
  let { id_usuario } = req.body;
  id_area = parseInt(id_area); // Base 10
  id_usuario = parseInt(id_usuario);

  const request = {
    "id_area": id_area,
    "id_usuario": id_usuario
  }

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlAltaAreaAdministrada = URL_BASE + "/areas_administradas/crear_area_administrada"; 
  // Realizar la llamada a la API para crear el área
  callApi(urlAltaAreaAdministrada, request, token, 'POST')
    .then(response => 
    {
      const urlObtenerUsuarios = URL_BASE + "/usuarios/obtener_usuarios"
      callApi(urlObtenerUsuarios, null, token, 'GET')
      .then(response => 
      {
          const usuarios = response.usuarios; // Asigna la respuesta a la variable
          const urlObtenerAreas = URL_BASE + "/areas/obtener_areas";
    
          callApi(urlObtenerAreas, null, token, 'GET')
            .then(response => {
              const areas = response.areas; // Obtén la lista de áreas del API
              res.render("crearAreasAdministradasFormulario", { usuario, areas, usuarios, area_administrada_creada_exito: true });
            })
            .catch(err => {
              res.status(500).send("Error en el servidor");
            });
      })

    })
    .catch(err => res.status(500).send("Error en el servidor"+err));
});



// PROTOTIPOS
app.get("/mostrar/prototipos", (req, res) => {
  const usuarioCookie = req.cookies['usuario'];

  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  const urlObtenerPrototipos = URL_BASE + "/prototipos/obtener_prototipos";

  callApi(urlObtenerPrototipos, null, token, 'GET')
    .then(response => {
      const prototipos = response.prototipos; // Obtén la lista de prototipos del API
      res.render("mostrarPrototipos", { usuario, prototipos });
    })
    .catch(err => {
      res.status(500).send("Error al obtener los prototipos.");
    });
});

app.post("/formulario/prototipo", async (req, res) => {
  // Verificar si el usuario está autenticado
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  // Obtener el id_prototipo del cuerpo de la solicitud
  const { id_prototipo } = req.body;

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;

  // Construir la URL para obtener el prototipo
  let urlObtenerPrototipo = URL_BASE + "/prototipos/obtener_prototipo/id_prototipo=" + id_prototipo;

  callApi(urlObtenerPrototipo, null, token, 'GET')
    .then(response => {
      const prototipoActualizar = response.prototipo; // Obtener los datos del prototipo de la respuesta
      return res.render("formularioEditarPrototipo", { usuario, prototipoActualizar }); // Renderizar el formulario de edición
    })
    .catch(err => res.status(500).send("Error en el servidor "+err));
});

app.post("/actualizar/prototipo", async (req, res) => {
  // Acceder al id_prototipo del cuerpo de la solicitud
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  let { id_prototipo, id_area } = req.body;

  // Convertir el id_prototipo y id_area a número
  id_prototipo = Number(id_prototipo);
  id_area = Number(id_area);

  // Crear el objeto de solicitud para actualizar el prototipo
  const request = { id_prototipo, id_area };

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlActualizarPrototipo = URL_BASE + "/prototipos/actualizar_prototipo";

  // Llamar a la API para actualizar el prototipo
  callApi(urlActualizarPrototipo, request, token, 'PUT')
    .then(response => {
      let urlObtenerPrototipos = URL_BASE + "/prototipos/obtener_prototipos";
      callApi(urlObtenerPrototipos, null, token, 'GET')
        .then(response => {
          const prototipos = response.prototipos; // Asigna la respuesta a la variable
          res.render("mostrarPrototipos", { usuario, prototipos, actualizacion_exitosa: true });
        })
        .catch(err => res.status(500).send("Error en el servidor "+err));
    })
    .catch(err => res.status(500).send("Error en el servidor "+err));
});

app.post("/eliminar/prototipo", async (req, res) => {
  // Acceder al id_prototipo del cuerpo de la solicitud
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  let { id_prototipo } = req.body;
  id_prototipo = String(id_prototipo); // Convertir id_prototipo a string si es necesario

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlEliminarPrototipo = URL_BASE + "/prototipos/eliminar_prototipo/" + id_prototipo;

  // Llamada a la API para eliminar el prototipo
  callApi(urlEliminarPrototipo, null, token, 'DELETE')
    .then(response => {
      let urlObtenerPrototipos = URL_BASE + "/prototipos/obtener_prototipos";
      callApi(urlObtenerPrototipos, null, token, 'GET')
        .then(response => {
          const prototipos = response.prototipos;  // Asigna la respuesta a la variable
          res.render("mostrarPrototipos", { usuario, prototipos, eliminacion_exitosa: true });
        })
        .catch(err => res.status(500).send("Error en el servidor "+err));
    })
    .catch(err => res.status(500).send("Error en el servidor "+err));
});

app.get("/crear/prototipo", async (req, res) => 
{
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }
  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlVerificarPrototipos = URL_BASE + "/prototipos/verificar_insert"; 

  // Realizar la llamada a la API para crear el prototipo
  callApi(urlVerificarPrototipos, null, token, 'GET')
    .then(response => {
      const resultado = response.verificar.resultado;

      if(resultado == 0)
      {
        res.render("noEsposibleCrearPrototipo", {usuario});
      }
      else
      {

        // Construir la URL para obtener el área
        let urlObtenerSensoresSinPrototipo = URL_BASE + "/sensores_de_humo/obtener_sensores_sin_prot";

        callApi(urlObtenerSensoresSinPrototipo, null, token, 'GET')
          .then(response => {

            const camaras = response.camaras;
            const sensores_de_humo = response.sensores_de_humo;
            const sensores_de_temperatura = response.sensores_de_temperatura;



            const urlObtenerAreas = URL_BASE + "/areas/obtener_areas";
            callApi(urlObtenerAreas, null, token, 'GET')
              .then(response => {
                const areas = response.areas; // Obtén la lista de áreas del API
                // Renderiza el formulario para crear un prototipo
                res.render("crearPrototipoFormulario", { usuario, camaras, sensores_de_humo, sensores_de_temperatura, areas });
              })
              .catch(err => {
                res.status(500).send("Error en el servidor");
              });

          
          
          
          })
          .catch(err => res.status(500).send("Error en el servidor"+err));
      }
    })
    .catch(err => res.status(500).send("Error en el servidor "+err));
});

app.post("/alta/prototipo", async (req, res) => {
  // Acceder al usuario de la sesión
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  // Obtener los valores de los campos desde el cuerpo de la solicitud
  let { id_area, id_camara, id_sensor_de_humo, id_sensor_de_temperatura } = req.body;

  id_area = parseInt(id_area, 10);
  id_camara = parseInt(id_camara, 10);
  id_sensor_de_humo = parseInt(id_sensor_de_humo, 10);
  id_sensor_de_temperatura = parseInt(id_sensor_de_temperatura, 10);

  // Preparar la solicitud para crear el prototipo
  const request = { 
    id_area, 
    id_camara, 
    id_sensor_de_humo, 
    id_sensor_de_temperatura 
  };

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlAltaPrototipo = URL_BASE + "/prototipos/crear_prototipo"; 

  // Realizar la llamada a la API para crear el prototipo
  callApi(urlAltaPrototipo, request, token, 'POST')
    .then(response => {


    let urlVerificarPrototipos = URL_BASE + "/prototipos/verificar_insert"; 

    // Realizar la llamada a la API para crear el prototipo
    callApi(urlVerificarPrototipos, null, token, 'GET')
    .then(response => {
      const resultado = response.verificar.resultado;

      if(resultado == 0)
      {
        res.render("noEsposibleCrearPrototipo", {usuario, prototipo_creado_exito: true});
      }
      else
      {

        // Construir la URL para obtener el área
        let urlObtenerSensoresSinPrototipo = URL_BASE + "/sensores_de_humo/obtener_sensores_sin_prot";

        callApi(urlObtenerSensoresSinPrototipo, null, token, 'GET')
          .then(response => {

            const camaras = response.camaras;
            const sensores_de_humo = response.sensores_de_humo;
            const sensores_de_temperatura = response.sensores_de_temperatura;



            const urlObtenerAreas = URL_BASE + "/areas/obtener_areas";
            callApi(urlObtenerAreas, null, token, 'GET')
              .then(response => {
                const areas = response.areas; // Obtén la lista de áreas del API
                // Renderiza el formulario para crear un prototipo
                res.render("crearPrototipoFormulario", { usuario, camaras, sensores_de_humo, sensores_de_temperatura, areas, prototipo_creado_exito: true });
              })
              .catch(err => {
                res.status(500).send("Error en el servidor");
              });

          
          
          
          })
          .catch(err => res.status(500).send("Error en el servidor"+err));
      }
    })
    .catch(err => res.status(500).send("Error en el servidor "+err));

    })
    .catch(err => res.status(500).send("Error en el servidor "+err));
});


//SENSORES DE TEMPERATURA
app.get("/mostrar/sensores_de_temperatura", (req, res) => {
  const usuarioCookie = req.cookies['usuario'];
  
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  const urlObtenerSensores = URL_BASE + "/sensores_de_temperatura/obtener_sensores_de_temperatura";
  res.render("mostrarSensoresDeTemperatura", { usuario });
});

app.get("/api/sensores_de_temperatura", (req, res) => {
  const usuarioCookie = req.cookies['usuario'];
  
  if (!usuarioCookie) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  const urlObtenerSensores = URL_BASE + "/sensores_de_temperatura/obtener_sensores_de_temperatura";

  callApi(urlObtenerSensores, null, token, 'GET')
    .then(response => {
      res.json(response.sensores_de_temperatura); // Devuelve los sensores en formato JSON
    })
    .catch(err => {
      res.status(500).json({ error: "Error al obtener los sensores de temperatura." });
    });
});

app.post("/eliminar/sensor_de_temperatura", async (req, res) => {
  // Acceder al id_sensor_de_temperatura del cuerpo de la solicitud
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  let { id_sensor_de_temperatura } = req.body;
  id_sensor_de_temperatura = String(id_sensor_de_temperatura); // Convertir clave_sensor_de_temperatura a string si es necesario

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlEliminarSensor = URL_BASE + "/sensores_de_temperatura/eliminar_sensor_de_temperatura/id_sensor_de_temperatura=" + id_sensor_de_temperatura;



  const urlObtenerPrototipos = URL_BASE + "/prototipos/obtener_prototipo/id_sensor_temperatura=" + id_sensor_de_temperatura;
  callApi(urlObtenerPrototipos, null, token, 'GET')
  .then(response => {

      // Verificar si prototipos es nulo, indefinido o vacío
      if (response.prototipo) 
      {




          let urlObtenerSensores = URL_BASE + "/sensores_de_temperatura/obtener_sensores_de_temperatura";
          callApi(urlObtenerSensores, null, token, 'GET')
            .then(response => {
              const sensores = response.sensores_de_temperatura;  // Asigna la respuesta a la variable
              res.render("mostrarSensoresDeTemperatura", { usuario, sensores, sensor_con_prototipo: true });
            })
            .catch(err => res.status(500).send("Error en el servidor " + err));




      }
      else
      {



        // Llamada a la API para eliminar el sensor
        callApi(urlEliminarSensor, null, token, 'DELETE')
          .then(response => {
            let urlObtenerSensores = URL_BASE + "/sensores_de_temperatura/obtener_sensores_de_temperatura";
            callApi(urlObtenerSensores, null, token, 'GET')
              .then(response => {
                const sensores = response.sensores_de_temperatura;  // Asigna la respuesta a la variable
                res.render("mostrarSensoresDeTemperatura", { usuario, sensores, eliminacion_exitosa: true });
              })
              .catch(err => res.status(500).send("Error en el servidor " + err));
          })
          .catch(err => res.status(500).send("Error en el servidor " + err));



      }
  })
  .catch(err => {
      console.error("Error al obtener los prototipos:", err);
      res.status(500).send("Error al obtener los prototipos.");
  });

































});

app.get("/crear/sensor_de_temperatura", async (req, res) => {
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }
  const usuario = JSON.parse(usuarioCookie);
  res.render("crearSensorDeTemperaturaFormulario", { usuario });
});

app.post("/alta/sensor_de_temperatura", async (req, res) => {
  // Acceder al usuario de la sesión
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  // Obtener los datos del sensor de temperatura desde el cuerpo de la solicitud
  let { clave_sensor_de_temperatura, marca_sensor_de_temperatura, nombre_sensor_de_temperatura } = req.body;

  // Preparar la solicitud
  const request = {
    clave_sensor_de_temperatura,
    marca_sensor_de_temperatura,
    nombre_sensor_de_temperatura
  };

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlAltaSensor = URL_BASE + "/sensores_de_temperatura/crear_sensor_de_temperatura"; 

  // Realizar la llamada a la API para crear el sensor de temperatura
  callApi(urlAltaSensor, request, token, 'POST')
    .then(response => {
      // Redirigir de vuelta al formulario con el mensaje de éxito
      res.render("crearSensorDeTemperaturaFormulario", { usuario, sensor_creado_exito: true });
    })
    .catch(err => res.status(500).send("Error en el servidor "+err));
});


//CAMARA
app.get("/mostrar/camaras", (req, res) => {
  const usuarioCookie = req.cookies['usuario'];
  
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }
  
  const usuario = JSON.parse(usuarioCookie);
  res.render("mostrarCamaras", { usuario });
});

app.get("/api/camaras", (req, res) => {
  const usuarioCookie = req.cookies['usuario'];
  
  if (!usuarioCookie) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  const urlObtenerCamaras = URL_BASE + "/camaras/obtener_camaras";

  callApi(urlObtenerCamaras, null, token, 'GET')
    .then(response => {
      res.json(response.camaras); // Devuelve las cámaras en formato JSON
    })
    .catch(err => {
      res.status(500).json({ error: "Error al obtener las cámaras." });
    });
});

app.post("/eliminar/camara", async (req, res) => {
  // Acceder al id_camara del cuerpo de la solicitud
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  let { id_camara } = req.body;
  id_camara = String(id_camara); // Convertir id_camara a string si es necesario

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlEliminarCamara = URL_BASE + "/camaras/eliminar_camara/id_camara=" + id_camara;




  const urlObtenerPrototipos = URL_BASE + "/prototipos/obtener_prototipo/id_camara=" + id_camara;
  callApi(urlObtenerPrototipos, null, token, 'GET')
  .then(response => {

      // Verificar si prototipos es nulo, indefinido o vacío
      if (response.prototipo) 
      {



        let urlObtenerCamaras = URL_BASE + "/camaras/obtener_camaras";
        callApi(urlObtenerCamaras, null, token, 'GET')
          .then(response => {
            const camaras = response.camaras; // Asigna la respuesta a la variable
            res.render("mostrarCamaras", { usuario, camaras, sensor_con_prototipo: true });
          })
          .catch(err => res.status(500).send("Error en el servidor " + err));




      }
      else
      {



        // Llamada a la API para eliminar la cámara
        callApi(urlEliminarCamara, null, token, 'DELETE')
          .then(response => {
            let urlObtenerCamaras = URL_BASE + "/camaras/obtener_camaras";
            callApi(urlObtenerCamaras, null, token, 'GET')
              .then(response => {
                const camaras = response.camaras; // Asigna la respuesta a la variable
                res.render("mostrarCamaras", { usuario, camaras, eliminacion_exitosa: true });
              })
              .catch(err => res.status(500).send("Error en el servidor " + err));
          })
          .catch(err => res.status(500).send("Error en el servidor " + err));



      }
  })
  .catch(err => {
      console.error("Error al obtener los prototipos:", err);
      res.status(500).send("Error al obtener los prototipos.");
  });























  });

app.get("/crear/camara", async (req, res) => {
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }
  const usuario = JSON.parse(usuarioCookie);
  res.render("crearCamaraFormulario", { usuario });
});

app.post("/alta/camara", async (req, res) => {
  // Acceder al usuario de la sesión
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  // Obtener los datos de la cámara desde el cuerpo de la solicitud
  let { clave_camara, marca_camara, nombre_camara } = req.body;

  // Preparar la solicitud
  const request = { clave_camara, marca_camara, nombre_camara };

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlAltaCamara = URL_BASE + "/camaras/crear_camara";

  // Realizar la llamada a la API para crear la cámara
  callApi(urlAltaCamara, request, token, 'POST')
    .then(response => {
      // Redirigir de vuelta al formulario con el mensaje de éxito
      res.render("crearCamaraFormulario", { usuario, camara_creada_exito: true });
    })
    .catch(err => {
      res.status(500).render("crearCamaraFormulario", { usuario, camara_creada_exito: false, error: "Error al crear la cámara." });
    });
});


//SENOSORES DE HUMO
app.get("/mostrar/sensores_de_humo", (req, res) => {
  const usuarioCookie = req.cookies['usuario'];
  
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }
  
  const usuario = JSON.parse(usuarioCookie);
  res.render("mostrarSensoresDeHumo", { usuario });
});

app.get("/api/sensores_de_humo", (req, res) => {
  const usuarioCookie = req.cookies['usuario'];
  
  if (!usuarioCookie) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  const urlObtenerSensores = URL_BASE + "/sensores_de_humo/obtener_sensores_de_humo";

  callApi(urlObtenerSensores, null, token, 'GET')
    .then(response => {
      res.json(response.sensores_de_humo); // Devuelve los sensores de humo en formato JSON
    })
    .catch(err => {
      res.status(500).json({ error: "Error al obtener los sensores de humo." });
    });
});

app.post("/eliminar/sensor_de_humo", async (req, res) => {
  // Acceder al id_sensor_de_humo del cuerpo de la solicitud
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  let { id_sensor_de_humo } = req.body;
  id_sensor_de_humo = String(id_sensor_de_humo); // Convertir id_sensor_de_humo a string si es necesario

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlEliminarSensor = URL_BASE + "/sensores_de_humo/eliminar_sensor_de_humo/id_sensor_de_humo=" + id_sensor_de_humo;










  
  const urlObtenerPrototipos = URL_BASE + "/prototipos/obtener_prototipo/id_sensor_humo=" + id_sensor_de_humo;
  callApi(urlObtenerPrototipos, null, token, 'GET')
  .then(response => {

      // Verificar si prototipos es nulo, indefinido o vacío
      if (response.prototipo) 
      {



        let urlObtenerSensoresDeHumo = URL_BASE + "/sensores_de_humo/obtener_sensores_de_humo";
        callApi(urlObtenerSensoresDeHumo, null, token, 'GET')
          .then(response => {
            const sensoresDeHumo = response.sensores_de_humo; // Asigna la respuesta a la variable
            res.render("mostrarSensoresDeHumo", { usuario, sensoresDeHumo, sensor_con_prototipo: true });
          })
          .catch(err => res.status(500).send("Error en el servidor " + err));




      }
      else
      {



        // Llamada a la API para eliminar el sensor de humo
        callApi(urlEliminarSensor, null, token, 'DELETE')
          .then(response => {
            let urlObtenerSensoresDeHumo = URL_BASE + "/sensores_de_humo/obtener_sensores_de_humo";
            callApi(urlObtenerSensoresDeHumo, null, token, 'GET')
              .then(response => {
                const sensoresDeHumo = response.sensores_de_humo; // Asigna la respuesta a la variable
                res.render("mostrarSensoresDeHumo", { usuario, sensoresDeHumo, eliminacion_exitosa: true });
              })
              .catch(err => res.status(500).send("Error en el servidor " + err));
          })
          .catch(err => res.status(500).send("Error en el servidor " + err));



      }
  })
  .catch(err => {
      console.error("Error al obtener los prototipos:", err);
      res.status(500).send("Error al obtener los prototipos.");
  });










  });

app.get("/crear/sensor_de_humo", async (req, res) => {
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }
  const usuario = JSON.parse(usuarioCookie);
  // Renderiza el formulario con los datos predeterminados
  res.render("crearSensorDeHumoFormulario", { usuario});
});

app.post("/alta/sensor_de_humo", async (req, res) => {
  // Acceder al usuario de la sesión
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  // Obtener los datos del sensor de humo desde el cuerpo de la solicitud
  let { clave_sensor_de_humo, marca_sensor_de_humo, nombre_sensor_de_humo } = req.body;

  // Preparar la solicitud
  const request = { clave_sensor_de_humo, marca_sensor_de_humo, nombre_sensor_de_humo };

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlAltaSensorDeHumo = URL_BASE + "/sensores_de_humo/crear_sensor_de_humo";

  // Realizar la llamada a la API para crear el sensor de humo
  callApi(urlAltaSensorDeHumo, request, token, 'POST')
    .then(response => {
      // Redirigir de vuelta al formulario con el mensaje de éxito
      res.render("crearSensorDeHumoFormulario", { usuario, sensor_creado_exito: true });
    })
    .catch(err => {
      res.status(500).render("crearSensorDeHumoFormulario", { usuario, sensor_creado_exito: false, error: "Error al crear el sensor de humo." });
    });
});

//TELEMETRIA
app.get("/mostrar/registros_de_telemetria", (req, res) => {
  const usuarioCookie = req.cookies['usuario'];

  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  const usuario = JSON.parse(usuarioCookie);
  res.render("mostrarRegistrosDeTelemetria", { usuario });
});

app.get("/api/registros_de_telemetria", (req, res) => {
  const usuarioCookie = req.cookies['usuario'];

  if (!usuarioCookie) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  const urlObtenerRegistrosDeTelemetria = URL_BASE + "/registros_de_telemetria/obtener_registros_de_telemetria";

  callApi(urlObtenerRegistrosDeTelemetria, null, token, 'GET')
    .then(response => {
      res.json(response.registros_de_telemetria); // Devuelve los registros de telemetría en formato JSON
    })
    .catch(err => {
      res.status(500).json({ error: "Error al obtener los registros de telemetría." });
    });
});

//alertas


app.get("/mostrar/alertas", (req, res) => {
  const usuarioCookie = req.cookies['usuario'];
  
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  const urlObtenerAlertas = URL_BASE + "/registros_de_telemetria/obtener_alertas";
  
  const request ={
    mas_recientes: false
  }

  callApi(urlObtenerAlertas, request, token, 'POST')
    .then(response => {
      const alertas = response.alertas; // Obtén la lista de áreas del API
      res.render("mostrarAlertas", { usuario, alertas });
    })
    .catch(err => {
      res.status(500).send("Error en el servidor");
    });
});

// umbrales
app.get("/formulario/humbrales", async (req, res) => {
  // Verificar si el usuario está autenticado
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }


  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;

  // Construir la URL para obtener el prototipo
  let urlObtenerUmbrales = URL_BASE + "/sensores_de_humo/obtener_umbrales";

  callApi(urlObtenerUmbrales, null, token, 'GET')
    .then(response => {
      const umbralesActualizar = response.umbrales; // Obtener los datos del prototipo de la respuesta
      return res.render("formularioEditarUmbrales", { usuario, umbralesActualizar }); // Renderizar el formulario de edición
    })
    .catch(err => res.status(500).send("Error en el servidor "+err));
});

app.post("/actualizar/umbrales", async (req, res) => {
  // Acceder al id_prototipo del cuerpo de la solicitud
  const usuarioCookie = req.cookies['usuario'];
  if (!usuarioCookie) {
    return res.redirect("/401"); // Redirige si no hay sesión
  }

  let {humedad_moderada_max, humedad_critica_max, temperatura_moderada_min, temperatura_critica_min, humo_moderado_min, humo_critico_min, co2_moderado_min, co2_critico_min, lpg_moderado_min, lpg_critico_min } = req.body;

  // Convertir a flotantes
  const request = {
    humedad_moderada_max: parseFloat(humedad_moderada_max),
    humedad_critica_max: parseFloat(humedad_critica_max),
    temperatura_moderada_min: parseFloat(temperatura_moderada_min),
    temperatura_critica_min: parseFloat(temperatura_critica_min),
    humo_moderado_min: parseFloat(humo_moderado_min),
    humo_critico_min: parseFloat(humo_critico_min),
    co2_moderado_min: parseFloat(co2_moderado_min),
    co2_critico_min: parseFloat(co2_critico_min),
    lpg_moderado_min: parseFloat(lpg_moderado_min),
    lpg_critico_min: parseFloat(lpg_critico_min)
  };
  

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;
  let urlActualizarPrototipos = URL_BASE + "/sensores_de_humo/actualizar_umbrales";

  // Llamar a la API para actualizar el prototipo
  callApi(urlActualizarPrototipos, request, token, 'PUT')
    .then(response => {
      // Construir la URL para obtener el prototipo
      let urlObtenerUmbrales = URL_BASE + "/sensores_de_humo/obtener_umbrales";

      callApi(urlObtenerUmbrales, null, token, 'GET')
        .then(response => {
          const umbralesActualizar = response.umbrales; // Obtener los datos del prototipo de la respuesta
          return res.render("formularioEditarUmbrales", { usuario, umbralesActualizar, actualizacion_exitosa: true }); // Renderizar el formulario de edición
        })
        .catch(err => res.status(500).send("Error en el servidor " + err));
    })
    .catch(err => res.status(500).send("Error en el servidor " + err));
});

//Responsable --------------------------------------------------------------------------------
app.get("/login/responsable", async (req, res) => {
  res.clearCookie('usuario', {
    httpOnly: true, 
    secure: false, 
  });
  res.render("loginResponsable")
});

app.post("/login/responsable", async (req, res) => {
  //obtenerRequest
  const { email_usuario, contrasenia_usuario } = req.body;
  const request = { email_usuario, contrasenia_usuario };
  //url
  const urlLoginResponsable = URL_BASE + "/login/responsable"

  //primera llamada a la API
  callApi(urlLoginResponsable, request, null, 'POST')
    .then(response => {
      const usuario = response; // Asigna la respuesta a la variable

      res.cookie('usuarioResponsable', JSON.stringify(usuario),
        {
          maxAge: 1000 * 60 * 60 * 2, // La cookie expira en 2 horas
          httpOnly: true, // La cookie no es accesible desde JavaScript (más segura)
          secure: false, // Si usas HTTPS, cámbialo a true
        });

      res.clearCookie('usuario', {
        httpOnly: true, // Igual que cuando se creó
        secure: false, // Igual que cuando se creó, ajusta según tu configuración (si usas HTTPS, pon true)
      });

      const exito = usuario.exito;
      if (exito) {
        const token = usuario.token;

        let id_usuario = usuario.usuario.id_usuario;
        id_usuario = String(id_usuario);
        let urlObtnerAreas = URL_BASE + "/areas/obtener_area_por_usuario/id_usuario=" + id_usuario;
        callApi(urlObtnerAreas, null, token, 'GET')
          .then(response => {
            const areas = response.areas;
            res.render("dashboardResponsable", { usuario, areas });
          })
          .catch
          (
            err => {
              res.render("loginResponsable", { credenciales_incorrectas: true });
            }
          );
      }
      else {
        res.render("loginResponsable", { credenciales_incorrectas: true });
      }
    })
    .catch(err => {
      res.render("loginResponsable", { credenciales_incorrectas: true });
    });
});

app.post("/registros_telemetria/por_area", async (req, res) => {
    // Acceder al id_prototipo del cuerpo de la solicitud
    const usuarioCookie = req.cookies['usuarioResponsable'];
    if (!usuarioCookie) {
      return res.redirect("/401"); // Redirige si no hay sesión
    }
  
    let { id_area } = req.body;
  
    // Convertir el id_prototipo y id_area a número
    id_area = String(id_area);
  
    let fecha_inicio = "2024-12-01 00:00:00";
    let fecha_fin = "2024-12-30 23:59:59";
  
    // Crear el objeto de solicitud para actualizar el prototipo
    const request = { fecha_inicio: fecha_inicio, fecha_fin: fecha_fin };
  
    const usuario = JSON.parse(usuarioCookie);
    const token = usuario.token;
  
    let urlObtenerTelemetria = URL_BASE + "/registros_de_telemetria/obtener_metricas_por_area/id_area=" + id_area;
  
    // Llamar a la API para actualizar el prototipo
    callApi(urlObtenerTelemetria, request, token, 'POST')
      .then(response => {
        let telemetria = response;
        res.render("telemetriaPorArea", { telemetria, usuario });
      })
      .catch(err => res.status(500).send("Error en el servidor "+err));
});

app.get("/dashboard/responsable", (req, res) => 
    {
    
      const usuarioCookie = req.cookies['usuarioResponsable'];
      if (!usuarioCookie) 
      {
        return res.redirect("/401"); // Redirige si no hay sesión
      }
    
      const usuario = JSON.parse(usuarioCookie);
      const token = usuario.token;
      let id_usuario = usuario.usuario.id_usuario;
      id_usuario = String(id_usuario);
      let urlObtnerAreas = URL_BASE + "/areas/obtener_area_por_usuario/id_usuario=" + id_usuario;


      callApi(urlObtnerAreas, null, token, 'GET')
        .then(response => 
        {
          const areas = response.areas;
          res.render("dashboardResponsable", {usuario, areas});
        })
        .catch
        (
          err => 
          {
            res.render("loginResponsable", { credenciales_incorrectas: true });
          }
        );
});

app.post("/prototipos_por_area", (req, res) => {
      const usuarioCookie = req.cookies['usuarioResponsable'];
    
      if (!usuarioCookie) {
        return res.redirect("/401"); // Redirige si no hay sesión
      }

      let { id_area } = req.body;
  
      // Convertir el id_prototipo y id_area a número
      id_area = String(id_area);
    
      const usuario = JSON.parse(usuarioCookie);
      const token = usuario.token;

      const urlObtenerPrototipos = URL_BASE + "/prototipos/obtener_prototipos_por_area/id_area=" + id_area;
    
      callApi(urlObtenerPrototipos, null, token, 'GET')
        .then(response => {
          const prototipos = response.prototipos; // Obtén la lista de prototipos del API
          res.render("mostrarPrototiposPorArea", { usuario, prototipos });
        })
        .catch(err => {
          res.status(500).send("Error al obtener los prototipos.");
        });
});

app.post("/telemetria_por_prototipo", async (req, res) => {
      // Acceder al id_prototipo del cuerpo de la solicitud
      const usuarioCookie = req.cookies['usuarioResponsable'];
      if (!usuarioCookie) {
        return res.redirect("/401"); // Redirige si no hay sesión
      }
    
      let { id_prototipo } = req.body;
    
      // Convertir el id_prototipo y id_area a número
      id_prototipo = String(id_prototipo);
    
      let fecha_inicio = "2024-12-01 00:00:00";
      let fecha_fin = "2024-12-30 23:59:59";
    
      // Crear el objeto de solicitud para actualizar el prototipo
      const request = { fecha_inicio: fecha_inicio, fecha_fin: fecha_fin };
    
      const usuario = JSON.parse(usuarioCookie);
      const token = usuario.token;
    
      let urlObtenerTelemetria = URL_BASE + "/registros_de_telemetria/obtener_metricas_por_prototipo/id_prototipo=" + id_prototipo;
    
      // Llamar a la API para actualizar el prototipo
      callApi(urlObtenerTelemetria, request, token, 'POST')
        .then(response => {
          let telemetria = response;
          res.render("telemetriaPorPrototipo", { telemetria, usuario });
        })
        .catch(err => res.status(500).send("Error en el servidor "+err));
});

app.post("/mostrar/sensores", (req, res) => {
      const usuarioCookie = req.cookies['usuarioResponsable'];
      let { id_prototipo } = req.body;
    
      // Convertir el id_prototipo y id_area a número
      id_prototipo = String(id_prototipo);
      if (!usuarioCookie) {
        return res.redirect("/401"); // Redirige si no hay sesión
      }
      const usuario = JSON.parse(usuarioCookie);
      res.render("mostrarSensores", { usuario, id_prototipo: id_prototipo});
});

app.get("/api/sensores", (req, res) => {
      const usuarioCookie = req.cookies['usuarioResponsable'];
      
      if (!usuarioCookie) {
        return res.status(401).json({ error: "No autorizado" });
      }
    
      const usuario = JSON.parse(usuarioCookie);
      const token = usuario.token;
      const id_prototipo = req.query.id_prototipo; // Asume que se pasa como query param
      const urlObtenerSensores = `${URL_BASE}/sensores_de_humo/obtener_sensores/por_prototipo/id_prototipo=${id_prototipo}`;
    
      callApi(urlObtenerSensores, null, token, 'GET')
        .then(response => {
          res.json(response); // Devuelve toda la respuesta de la API
        })
        .catch(err => {
          res.status(500).json({ error: "Error al obtener los datos de los sensores." });
        });
});

app.get("/api/alertas", (req, res) => {
  const usuarioCookie = req.cookies['usuarioResponsable'];
  
  if (!usuarioCookie) {
    return res.status(401).json({ error: "No autorizado" });
  }

  const usuario = JSON.parse(usuarioCookie);
  const token = usuario.token;

  // Nueva URL y cuerpo de la solicitud
  const urlObtenerAlertas = `${URL_BASE}/registros_de_telemetria/obtener_alertas`;
  const requestBody = { mas_recientes: true };

  // Llamada a la API con método POST
  callApi(urlObtenerAlertas, requestBody, token, 'POST')
    .then(response => {
      res.json(response); // Devuelve toda la respuesta de la API
    })
    .catch(err => {
      res.status(500).json({ error: "Error al obtener las alertas de telemetría." });
    });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Servidor en http://127.0.0.1:${PORT}`);
});