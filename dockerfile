# Usa una imagen oficial de Node.js como base
FROM node:18

# Configura el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia solo los archivos necesarios para instalar las dependencias
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el resto de los archivos de tu proyecto al contenedor
COPY . /app

# Comando para ejecutar la aplicación
CMD ["npm", "run", "dev"]
