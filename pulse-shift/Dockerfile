# Estágio 1: Build da Aplicação React
# Usamos uma imagem Node para ter o ambiente de build (npm, etc.)
FROM node:20-alpine AS builder

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia os arquivos de dependência e instala
COPY package*.json ./
RUN npm install

# Copia o resto do código da aplicação
COPY . .

# Executa o comando de build do Vite para gerar os arquivos estáticos
RUN npm run build


# Estágio 2: Servidor de Produção
# Usamos uma imagem Nginx super leve para servir os arquivos estáticos gerados
FROM nginx:stable-alpine

# Copia os arquivos buildados do estágio 'builder' para a pasta do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia nosso arquivo de configuração customizado do Nginx
# Este arquivo é crucial para o React Router e para o proxy da API
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expõe a porta 80, que é a porta padrão do Nginx
EXPOSE 80

# O comando para iniciar o Nginx já é o padrão da imagem, então não precisamos adicioná-lo.