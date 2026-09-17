# Imagen base de Node.js
FROM node:20-alpine

WORKDIR /app

# Copiar dependencias
COPY package*.json ./

# Instalar TODAS las dependencias (incluyendo devDeps para compilar TypeScript)
RUN npm ci

# Copiar el codigo fuente
COPY . .

# Compilar TypeScript a JavaScript
RUN npm run build

# Eliminar devDependencies para reducir imagen final
RUN npm prune --production

# Puerto que expone Railway
EXPOSE 5000

# Comando de inicio
CMD ["node", "dist/server.js"]
